import { z } from "zod";
import type { DB } from "../db";
import * as store from "../db/store";
import { GitHubClient } from "../github/client";
import { GitHubError, repoSlug, type RepoRef } from "../github/url";
import { analyzeRepository } from "../analysis/analyze";
import { buildCourse } from "../analysis/course";

// In-process background runner (modular monolith: no extra infrastructure).
// Limits: max concurrent jobs, max duration per job. Jobs are persisted, so a crash leaves a
// 'failed/INTERRUPTED' row (retryable) instead of a job stuck forever.

const cfg = z.object({
  ANALYSIS_MAX_CONCURRENT: z.coerce.number().int().min(1).max(8).default(2),
  ANALYSIS_TTL_HOURS: z.coerce.number().min(0).max(24 * 30).default(24),
  ANALYSIS_MAX_DURATION_MS: z.coerce.number().int().min(5_000).max(600_000).default(120_000),
});
const loadCfg = () => cfg.parse(process.env);

interface RunnerState { running: number; queue: { id: number; ref: RepoRef; db: DB; client: GitHubClient }[] }
const g = globalThis as unknown as { __rtRunner?: RunnerState };
const state = (g.__rtRunner ??= { running: 0, queue: [] });

export interface StartResult { id: number; status: store.AnalysisStatus; cached: boolean }

export function startAnalysis(db: DB, ref: RepoRef, learnerId: string | null, client: GitHubClient = new GitHubClient()): StartResult {
  const c = loadCfg();
  const slug = repoSlug(ref);
  store.recoverStale(db, c.ANALYSIS_MAX_DURATION_MS * 2 + 60_000);

  const inflight = store.findInFlight(db, slug);
  if (inflight) return { id: inflight.id, status: inflight.status, cached: false }; // no duplicate expensive jobs

  const latest = store.findLatestCompleted(db, slug);
  if (latest?.finishedAt && Date.now() - Date.parse(latest.finishedAt) < c.ANALYSIS_TTL_HOURS * 3_600_000) {
    return { id: latest.id, status: "completed", cached: true };
  }

  store.ensureRepoStub(db, slug, ref.owner, ref.name);
  const id = store.createAnalysis(db, slug, learnerId);
  state.queue.push({ id, ref, db, client });
  queueMicrotask(pump);
  return { id, status: "queued", cached: false };
}

function pump() {
  const max = loadCfg().ANALYSIS_MAX_CONCURRENT;
  while (state.running < max && state.queue.length) {
    const job = state.queue.shift()!;
    state.running++;
    void run(job).finally(() => { state.running--; pump(); });
  }
}

const RETRYABLE = new Set(["RATE_LIMITED", "TIMEOUT", "NETWORK", "UPSTREAM"]);

async function run(job: RunnerState["queue"][number]) {
  const { id, ref, db, client } = job;
  const { ANALYSIS_MAX_DURATION_MS } = loadCfg();
  store.markProcessing(db, id);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const ing = await Promise.race([
      client.ingest(ref),
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new GitHubError("TIMEOUT", "The analysis took too long and was stopped. Try a smaller repository or retry.")), ANALYSIS_MAX_DURATION_MS); }),
    ]);
    const analysis = analyzeRepository(ing);
    const built = buildCourse(analysis, ing.files);
    store.upsertRepo(db, repoSlug(ref), { ...ing.meta });
    store.completeAnalysis(db, id, { commitSha: ing.commitSha, analysis, course: built.course, lessons: built.lessons, quizzes: built.quizzes, files: ing.files });
  } catch (e) {
    if (e instanceof GitHubError) {
      store.failAnalysis(db, id, e.code, e.message, RETRYABLE.has(e.code));
    } else {
      console.error("[analysis] unexpected failure for", repoSlug(ref), e instanceof Error ? e.message : String(e));
      store.failAnalysis(db, id, "INTERNAL", "The analysis failed unexpectedly. Please retry; if it keeps failing, the repository may not be supported.", true);
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** For tests: wait until nothing is queued or running. */
export async function idle(): Promise<void> {
  while (state.running > 0 || state.queue.length > 0) await new Promise((r) => setTimeout(r, 5));
}
