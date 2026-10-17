import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDb, type DB } from "@/lib/db";
import * as store from "@/lib/db/store";
import { GitHubClient, loadGitHubLimits } from "@/lib/github/client";
import { startAnalysis, idle } from "@/lib/jobs/analysisRunner";
import { fixtureIngestion } from "../analysis/fixture";

const json = (b: unknown, status = 200, h: Record<string, string> = {}) => new Response(JSON.stringify(b), { status, headers: h });
const files = Object.fromEntries(fixtureIngestion.files.map((f) => [f.path, f.content]));

function fakeFetch(opts: { fail?: number; delayMs?: number; headers?: Record<string, string> } = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    if (opts.fail) return json({ message: "x" }, opts.fail, opts.headers);
    if (url.endsWith("/repos/acme/shop")) return json({ name: "shop", full_name: "acme/shop", owner: { login: "acme" }, description: "A tiny web shop API", stargazers_count: 3, language: "TypeScript", default_branch: "main", html_url: "https://github.com/acme/shop" });
    if (url.includes("/commits/main")) return json({ sha: "abc123", commit: { tree: { sha: "t" } } });
    if (url.includes("/git/trees/")) return json({ sha: "t", truncated: false, tree: Object.entries(files).map(([path, c]) => ({ path, type: "blob", sha: "s", size: c.length })) });
    if (url.startsWith("https://raw.githubusercontent.com/acme/shop/abc123/")) {
      const p = decodeURIComponent(url.replace("https://raw.githubusercontent.com/acme/shop/abc123/", ""));
      return p in files ? new Response(files[p]) : new Response("", { status: 404 });
    }
    return json({}, 404);
  });
}
const client = (f: ReturnType<typeof fakeFetch>) => new GitHubClient(loadGitHubLimits({}), f as unknown as typeof fetch);
const ref = { owner: "acme", name: "shop" };

let db: DB;
beforeEach(async () => { await idle(); db = openDb(":memory:"); });

describe("analysis job lifecycle", () => {
  it("queued → completed with a stored course, files and commit SHA", async () => {
    const r = startAnalysis(db, ref, "L1", client(fakeFetch()));
    expect(r).toMatchObject({ status: "queued", cached: false });
    await idle();
    const row = store.getAnalysis(db, r.id)!;
    expect(row).toMatchObject({ status: "completed", commitSha: "abc123" });
    const s = store.loadAnalysis(db, r.id)!;
    expect(s.lessons.length).toBeGreaterThan(3);
    expect(s.analysis.entryPoints[0].path).toBe("src/index.ts");
    expect(store.getFiles(db, r.id).map((f) => f.path)).toContain("src/routes.ts");
    expect(store.listAnalyzedRepos(db)[0]).toMatchObject({ slug: "acme/shop", stars: 3 });
  });

  it("does not start a duplicate job while one is in flight", async () => {
    const f = fakeFetch({ delayMs: 20 });
    const a = startAnalysis(db, ref, "L1", client(f));
    const b = startAnalysis(db, ref, "L2", client(f));
    expect(b.id).toBe(a.id);
    await idle();
    const calls = f.mock.calls.filter(([u]) => String(u).endsWith("/repos/acme/shop")).length;
    expect(calls).toBe(1);
  });

  it("reuses a fresh completed analysis instead of re-running the model-free pipeline", async () => {
    const f = fakeFetch();
    const a = startAnalysis(db, ref, "L1", client(f));
    await idle();
    const n = f.mock.calls.length;
    const b = startAnalysis(db, ref, "L1", client(f));
    expect(b).toMatchObject({ id: a.id, status: "completed", cached: true });
    expect(f.mock.calls.length).toBe(n);
  });

  it("re-analyses once the cached result is older than the TTL", async () => {
    const a = startAnalysis(db, ref, "L1", client(fakeFetch()));
    await idle();
    db.prepare("UPDATE analyses SET finished_at = ? WHERE id = ?").run(new Date(Date.now() - 48 * 3_600_000).toISOString(), a.id);
    const b = startAnalysis(db, ref, "L1", client(fakeFetch()));
    expect(b.id).not.toBe(a.id);
    await idle();
  });

  it("marks failures as failed (never completed) with a retryable flag and user-safe message", async () => {
    const reset = String(Math.floor(Date.now() / 1000) + 300);
    const r = startAnalysis(db, ref, "L1", client(fakeFetch({ fail: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset } })));
    await idle();
    expect(store.getAnalysis(db, r.id)).toMatchObject({ status: "failed", errorCode: "RATE_LIMITED", retryable: true });
    expect(store.loadLatest(db, "acme/shop")).toBeNull();
  });

  it("not-found is a non-retryable failure and can be retried as a fresh job", async () => {
    const a = startAnalysis(db, ref, "L1", client(fakeFetch({ fail: 404 })));
    await idle();
    expect(store.getAnalysis(db, a.id)).toMatchObject({ status: "failed", errorCode: "NOT_FOUND", retryable: false });
    const b = startAnalysis(db, ref, "L1", client(fakeFetch()));
    expect(b.id).not.toBe(a.id);
    await idle();
    expect(store.getAnalysis(db, b.id)!.status).toBe("completed");
  });

  it("an unexpected internal error is stored generically (no stack/secret leakage)", async () => {
    const boom = { ingest: async () => { throw new Error("secret-token-123 /home/user/stack"); } } as unknown as GitHubClient;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = startAnalysis(db, ref, "L1", boom);
    await idle();
    const row = store.getAnalysis(db, r.id)!;
    expect(row).toMatchObject({ status: "failed", errorCode: "INTERNAL", retryable: true });
    expect(row.errorMessage).not.toContain("secret-token");
    spy.mockRestore();
  });

  it("limits concurrent jobs", async () => {
    let active = 0, peak = 0;
    const slow = (name: string) => ({
      ingest: async () => {
        active++; peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 30));
        active--;
        throw new Error("stop " + name);
      },
    }) as unknown as GitHubClient;
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const n of ["a", "b", "c", "d", "e"]) startAnalysis(db, { owner: "o", name: n }, "L", slow(n));
    await idle();
    expect(peak).toBeLessThanOrEqual(2); // ANALYSIS_MAX_CONCURRENT default
    vi.restoreAllMocks();
  });
});
