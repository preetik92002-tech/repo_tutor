import type { DB } from "./index";
import type { RepoAnalysis } from "../analysis/analyze";
import { courseRepoId } from "../analysis/course";
import type { Course, GlobalProgress, Lesson, LessonProgress, PublicQuiz, Quiz, QuizAttemptResult, RepoProgress } from "../types";

export type { PublicQuiz, PublicQuizQuestion, QuizAttemptResult } from "../types";
import type { IngestedFile, RepoMeta } from "../github/client";

export const PASS_PERCENT = 60;
const now = () => new Date().toISOString();

export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

export interface AnalysisRow {
  id: number;
  repoSlug: string;
  commitSha: string | null;
  status: AnalysisStatus;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

type Raw = Record<string, unknown>;
const toRow = (r: Raw): AnalysisRow => ({
  id: r.id as number, repoSlug: r.repo_slug as string, commitSha: (r.commit_sha as string) ?? null, status: r.status as AnalysisStatus,
  errorCode: (r.error_code as string) ?? null, errorMessage: (r.error_message as string) ?? null, retryable: !!r.retryable,
  createdAt: r.created_at as string, startedAt: (r.started_at as string) ?? null, finishedAt: (r.finished_at as string) ?? null,
});

// ─── Repos & analyses ────────────────────────────────────────
export function upsertRepo(db: DB, slug: string, meta: Pick<RepoMeta, "owner" | "name" | "description" | "stars" | "language" | "htmlUrl" | "defaultBranch">) {
  const t = now();
  db.prepare(
    `INSERT INTO repos (slug, owner, name, description, stars, language, html_url, default_branch, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET description=excluded.description, stars=excluded.stars, language=excluded.language,
       html_url=excluded.html_url, default_branch=excluded.default_branch, updated_at=excluded.updated_at`,
  ).run(slug, meta.owner, meta.name, meta.description, meta.stars, meta.language, meta.htmlUrl, meta.defaultBranch, t, t);
}

/** Ensures a repos row exists for a slug before the first (not yet fetched) analysis. */
export function ensureRepoStub(db: DB, slug: string, owner: string, name: string) {
  const t = now();
  db.prepare("INSERT OR IGNORE INTO repos (slug, owner, name, html_url, default_branch, created_at, updated_at) VALUES (?, ?, ?, ?, '', ?, ?)")
    .run(slug, owner, name, `https://github.com/${owner}/${name}`, t, t);
}

export function createAnalysis(db: DB, slug: string, requestedBy: string | null): number {
  const r = db.prepare("INSERT INTO analyses (repo_slug, status, requested_by, created_at) VALUES (?, 'queued', ?, ?)").run(slug, requestedBy, now());
  return Number(r.lastInsertRowid);
}

export function getAnalysis(db: DB, id: number): AnalysisRow | null {
  const r = db.prepare("SELECT * FROM analyses WHERE id = ?").get(id) as Raw | undefined;
  return r ? toRow(r) : null;
}

/** An analysis for this repo that is still running, so duplicate expensive jobs are not started. */
export function findInFlight(db: DB, slug: string): AnalysisRow | null {
  const r = db.prepare("SELECT * FROM analyses WHERE repo_slug = ? AND status IN ('queued','processing') ORDER BY id DESC LIMIT 1").get(slug) as Raw | undefined;
  return r ? toRow(r) : null;
}

export function findLatestCompleted(db: DB, slug: string): AnalysisRow | null {
  const r = db.prepare("SELECT * FROM analyses WHERE repo_slug = ? AND status = 'completed' ORDER BY id DESC LIMIT 1").get(slug) as Raw | undefined;
  return r ? toRow(r) : null;
}

export function markProcessing(db: DB, id: number) {
  db.prepare("UPDATE analyses SET status='processing', started_at=? WHERE id=? AND status='queued'").run(now(), id);
}

export interface CompletedPayload {
  commitSha: string;
  analysis: RepoAnalysis;
  course: Course;
  lessons: Lesson[];
  quizzes: Quiz[];
  files: IngestedFile[];
}

/** Atomic: either the whole result is saved and marked completed, or nothing is. */
export function completeAnalysis(db: DB, id: number, p: CompletedPayload) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM analysis_files WHERE analysis_id = ?").run(id);
    const ins = db.prepare("INSERT INTO analysis_files (analysis_id, path, language, size, content) VALUES (?, ?, ?, ?, ?)");
    for (const f of p.files) ins.run(id, f.path, f.language ?? null, f.size, f.content);
    db.prepare(
      `UPDATE analyses SET status='completed', commit_sha=?, analysis_json=?, course_json=?, lessons_json=?, quizzes_json=?,
         error_code=NULL, error_message=NULL, retryable=0, finished_at=? WHERE id=?`,
    ).run(p.commitSha, JSON.stringify(p.analysis), JSON.stringify(p.course), JSON.stringify(p.lessons), JSON.stringify(p.quizzes), now(), id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function failAnalysis(db: DB, id: number, code: string, message: string, retryable: boolean) {
  db.prepare("UPDATE analyses SET status='failed', error_code=?, error_message=?, retryable=?, finished_at=? WHERE id=? AND status != 'completed'")
    .run(code, message.slice(0, 500), retryable ? 1 : 0, now(), id);
}

/** Jobs left 'processing'/'queued' by a crashed/restarted server are failed (retryable) rather than hanging forever. */
export function recoverStale(db: DB, olderThanMs: number): number {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const r = db.prepare(
    `UPDATE analyses SET status='failed', error_code='INTERRUPTED', error_message='The analysis was interrupted (server restarted or timed out). Please retry.', retryable=1, finished_at=?
     WHERE status IN ('queued','processing') AND created_at < ?`,
  ).run(now(), cutoff);
  return Number(r.changes);
}

export interface StoredAnalysis {
  row: AnalysisRow;
  analysis: RepoAnalysis;
  course: Course;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export function loadAnalysis(db: DB, id: number): StoredAnalysis | null {
  const r = db.prepare("SELECT * FROM analyses WHERE id = ? AND status = 'completed'").get(id) as Raw | undefined;
  if (!r) return null;
  return {
    row: toRow(r),
    analysis: JSON.parse(r.analysis_json as string),
    course: JSON.parse(r.course_json as string),
    lessons: JSON.parse(r.lessons_json as string),
    quizzes: JSON.parse(r.quizzes_json as string),
  };
}

export function loadLatest(db: DB, slug: string): StoredAnalysis | null {
  const row = findLatestCompleted(db, slug);
  return row ? loadAnalysis(db, row.id) : null;
}

export function getFiles(db: DB, analysisId: number): { path: string; language: string | null; size: number; content: string }[] {
  return db.prepare("SELECT path, language, size, content FROM analysis_files WHERE analysis_id = ? ORDER BY path").all(analysisId) as never;
}

export function getFile(db: DB, analysisId: number, filePath: string) {
  return (db.prepare("SELECT path, language, size, content FROM analysis_files WHERE analysis_id = ? AND path = ?").get(analysisId, filePath) as
    | { path: string; language: string | null; size: number; content: string } | undefined) ?? null;
}

export function listAnalyzedRepos(db: DB, limit = 24) {
  return db.prepare(
    `SELECT r.slug, r.owner, r.name, r.description, r.stars, r.language, r.html_url AS htmlUrl, MAX(a.finished_at) AS analyzedAt
     FROM repos r JOIN analyses a ON a.repo_slug = r.slug AND a.status = 'completed'
     GROUP BY r.slug ORDER BY analyzedAt DESC LIMIT ?`,
  ).all(Math.min(Math.max(limit, 1), 100)) as { slug: string; owner: string; name: string; description: string; stars: number; language: string; htmlUrl: string; analyzedAt: string }[];
}

// ─── Learners ────────────────────────────────────────────────
export function ensureLearner(db: DB, id: string) {
  const t = now();
  db.prepare("INSERT INTO learners (id, created_at, last_seen_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at").run(id, t, t);
}

export function deleteLearner(db: DB, id: string) {
  db.prepare("DELETE FROM learners WHERE id = ?").run(id); // cascades to progress, attempts, visits
}

// ─── Quizzes & progress ──────────────────────────────────────

/** Quiz without answers or explanations: safe to send to the browser before it is attempted. */
export function toPublicQuiz(q: Quiz): PublicQuiz {
  return { lessonId: q.lessonId, questions: q.questions.map((x) => ({ id: x.id, question: x.question, options: x.options })) };
}

export class ProgressError extends Error {
  constructor(public readonly code: "NO_ANALYSIS" | "UNKNOWN_LESSON" | "NO_QUIZ" | "INVALID_ANSWERS" | "QUIZ_NOT_PASSED", message: string) {
    super(message);
  }
}

/** Scoring is done here, from the stored quiz. The browser only ever sends chosen option ids. */
export function recordQuizAttempt(db: DB, learnerId: string, slug: string, lessonId: string, answers: { questionId: string; selectedOptionId: string }[]): QuizAttemptResult {
  const stored = loadLatest(db, slug);
  if (!stored) throw new ProgressError("NO_ANALYSIS", "This repository has not been analysed yet.");
  const quiz = stored.quizzes.find((q) => q.lessonId === lessonId);
  if (!quiz) throw new ProgressError(stored.lessons.some((l) => l.id === lessonId) ? "NO_QUIZ" : "UNKNOWN_LESSON", "This lesson has no quiz.");

  const seen = new Set<string>();
  const chosen = new Map<string, string>();
  for (const a of answers) {
    const q = quiz.questions.find((x) => x.id === a.questionId);
    if (!q || seen.has(a.questionId) || !q.options.some((o) => o.id === a.selectedOptionId)) {
      throw new ProgressError("INVALID_ANSWERS", "The submitted answers do not match this quiz.");
    }
    seen.add(a.questionId);
    chosen.set(a.questionId, a.selectedOptionId);
  }
  const results = quiz.questions.map((q) => {
    const sel = chosen.get(q.id) ?? null;
    return { questionId: q.id, selectedOptionId: sel, correctOptionId: q.correctOptionId, correct: sel === q.correctOptionId, explanation: q.explanation };
  });
  const score = results.filter((r) => r.correct).length;
  const total = quiz.questions.length;
  const percent = Math.round((score / total) * 100);

  ensureLearner(db, learnerId);
  db.prepare("INSERT INTO quiz_attempts (learner_id, repo_slug, lesson_id, analysis_id, answers_json, score, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(learnerId, slug, lessonId, stored.row.id, JSON.stringify(answers), score, total, now());
  touchVisit(db, learnerId, slug, lessonId);
  return { lessonId, score, total, percent, passed: percent >= PASS_PERCENT, results };
}

/**
 * Completion is never granted for merely opening a lesson. Lessons with a quiz need a passing
 * attempt on record; lessons without one can be marked done explicitly.
 */
export function completeLesson(db: DB, learnerId: string, slug: string, lessonId: string): { completedAt: string } {
  const stored = loadLatest(db, slug);
  if (!stored) throw new ProgressError("NO_ANALYSIS", "This repository has not been analysed yet.");
  if (!stored.lessons.some((l) => l.id === lessonId)) throw new ProgressError("UNKNOWN_LESSON", "Unknown lesson.");
  if (stored.quizzes.some((q) => q.lessonId === lessonId)) {
    const best = db.prepare("SELECT MAX(score * 100.0 / total) AS pct FROM quiz_attempts WHERE learner_id = ? AND repo_slug = ? AND lesson_id = ?").get(learnerId, slug, lessonId) as { pct: number | null };
    if (best.pct === null || best.pct < PASS_PERCENT) {
      throw new ProgressError("QUIZ_NOT_PASSED", `Pass the quiz (${PASS_PERCENT}% or more) to complete this lesson.`);
    }
  }
  ensureLearner(db, learnerId);
  const t = now();
  db.prepare(
    `INSERT INTO lesson_progress (learner_id, repo_slug, lesson_id, analysis_id, completed_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(learner_id, repo_slug, lesson_id) DO NOTHING`,
  ).run(learnerId, slug, lessonId, stored.row.id, t);
  touchVisit(db, learnerId, slug, lessonId);
  const row = db.prepare("SELECT completed_at FROM lesson_progress WHERE learner_id=? AND repo_slug=? AND lesson_id=?").get(learnerId, slug, lessonId) as { completed_at: string };
  return { completedAt: row.completed_at };
}

export function touchVisit(db: DB, learnerId: string, slug: string, lessonId: string | null) {
  ensureLearner(db, learnerId);
  db.prepare(
    `INSERT INTO repo_visits (learner_id, repo_slug, last_lesson_id, last_accessed_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(learner_id, repo_slug) DO UPDATE SET last_lesson_id=COALESCE(excluded.last_lesson_id, last_lesson_id), last_accessed_at=excluded.last_accessed_at`,
  ).run(learnerId, slug, lessonId, now());
}

export interface RepoProgressDetail extends RepoProgress {
  slug: string;
  lastLessonId: string | null;
  bestScores: Record<string, { score: number; total: number }>;
}

function repoProgressFor(db: DB, learnerId: string, slug: string): RepoProgressDetail | null {
  const stored = loadLatest(db, slug);
  const visit = db.prepare("SELECT last_lesson_id, last_accessed_at FROM repo_visits WHERE learner_id=? AND repo_slug=?").get(learnerId, slug) as { last_lesson_id: string | null; last_accessed_at: string } | undefined;
  const done = db.prepare("SELECT lesson_id, completed_at FROM lesson_progress WHERE learner_id=? AND repo_slug=?").all(learnerId, slug) as { lesson_id: string; completed_at: string }[];
  const attempts = db.prepare("SELECT lesson_id, score, total, created_at FROM quiz_attempts WHERE learner_id=? AND repo_slug=? ORDER BY id DESC").all(learnerId, slug) as { lesson_id: string; score: number; total: number; created_at: string }[];
  if (!stored || (!visit && !done.length && !attempts.length)) return null;

  const validLessons = new Set(stored.lessons.map((l) => l.id));
  const doneMap = new Map(done.filter((d) => validLessons.has(d.lesson_id)).map((d) => [d.lesson_id, d.completed_at]));
  const best: RepoProgressDetail["bestScores"] = {};
  const latestAttempt = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    if (!latestAttempt.has(a.lesson_id)) latestAttempt.set(a.lesson_id, a);
    const b = best[a.lesson_id];
    if (!b || a.score / a.total > b.score / b.total) best[a.lesson_id] = { score: a.score, total: a.total };
  }
  const lessonProgress: LessonProgress[] = stored.lessons.map((l) => {
    const la = latestAttempt.get(l.id);
    const completedAt = doneMap.get(l.id);
    return {
      lessonId: l.id,
      status: completedAt ? "completed" : la || visit?.last_lesson_id === l.id ? "in_progress" : "not_started",
      completedAt,
      quizResult: la ? { lessonId: l.id, answers: [], score: la.score, total: la.total, completedAt: la.created_at } : undefined,
    };
  });
  const totalLessons = stored.lessons.length;
  return {
    slug, repoId: courseRepoId(stored.analysis.repo.fullName), repoFullName: stored.analysis.repo.fullName,
    repoDescription: stored.analysis.repo.description, completedLessons: doneMap.size, totalLessons,
    percentComplete: totalLessons ? Math.round((doneMap.size / totalLessons) * 100) : 0,
    lastAccessedAt: visit?.last_accessed_at ?? attempts[0]?.created_at ?? [...doneMap.values()].sort().pop() ?? now(),
    lessonProgress, lastLessonId: visit?.last_lesson_id ?? null, bestScores: best,
  };
}

export function getRepoProgress(db: DB, learnerId: string, slug: string): RepoProgressDetail | null {
  return repoProgressFor(db, learnerId, slug);
}

export function getGlobalProgress(db: DB, learnerId: string): GlobalProgress & { repos: RepoProgressDetail[] } {
  const slugs = (db.prepare(
    `SELECT repo_slug FROM (SELECT repo_slug, last_accessed_at AS t FROM repo_visits WHERE learner_id=?
      UNION SELECT repo_slug, completed_at FROM lesson_progress WHERE learner_id=?
      UNION SELECT repo_slug, created_at FROM quiz_attempts WHERE learner_id=?) GROUP BY repo_slug ORDER BY MAX(t) DESC LIMIT 50`,
  ).all(learnerId, learnerId, learnerId) as { repo_slug: string }[]).map((r) => r.repo_slug);
  const repos = slugs.map((s) => repoProgressFor(db, learnerId, s)).filter((r): r is RepoProgressDetail => !!r);
  return {
    repos,
    totalLessonsCompleted: repos.reduce((n, r) => n + r.completedLessons, 0),
    totalQuizzesTaken: (db.prepare("SELECT COUNT(*) AS n FROM quiz_attempts WHERE learner_id=?").get(learnerId) as { n: number }).n,
  };
}

export function resetProgress(db: DB, learnerId: string, slug?: string) {
  const where = slug ? " AND repo_slug = ?" : "";
  const args = slug ? [learnerId, slug] : [learnerId];
  for (const t of ["lesson_progress", "quiz_attempts", "repo_visits"]) db.prepare(`DELETE FROM ${t} WHERE learner_id = ?${where}`).run(...args);
}
