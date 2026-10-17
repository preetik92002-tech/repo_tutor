import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDb, migrate, type DB } from "@/lib/db";
import * as store from "@/lib/db/store";
import { ProgressError, PASS_PERCENT } from "@/lib/db/store";
import { analyzeRepository } from "@/lib/analysis/analyze";
import { buildCourse } from "@/lib/analysis/course";
import { fixtureIngestion } from "../analysis/fixture";

const SLUG = "acme/shop";
const analysis = analyzeRepository(fixtureIngestion);
const built = buildCourse(analysis, fixtureIngestion.files);

function seed(db: DB, slug = SLUG) {
  store.ensureRepoStub(db, slug, "acme", "shop");
  store.upsertRepo(db, slug, { owner: "acme", name: "shop", description: "d", stars: 1, language: "TypeScript", htmlUrl: "https://github.com/acme/shop", defaultBranch: "main" });
  const id = store.createAnalysis(db, slug, "learner-x");
  store.markProcessing(db, id);
  store.completeAnalysis(db, id, { commitSha: "abc123", analysis, course: built.course, lessons: built.lessons, quizzes: built.quizzes, files: fixtureIngestion.files });
  return id;
}
const answersFor = (lessonId: string, correct: boolean) =>
  built.quizzes.find((q) => q.lessonId === lessonId)!.questions.map((q) => ({
    questionId: q.id,
    selectedOptionId: correct ? q.correctOptionId : q.options.find((o) => o.id !== q.correctOptionId)!.id,
  }));

let db: DB;
beforeEach(() => { db = openDb(":memory:"); });

describe("migrations", () => {
  it("apply once and are idempotent", () => {
    expect(migrate(db)).toEqual([]);
    expect(db.prepare("SELECT version FROM schema_migrations").all()).toHaveLength(1);
  });
});

describe("analysis lifecycle", () => {
  it("stores a completed analysis with source files and reloads it", () => {
    const id = seed(db);
    const s = store.loadLatest(db, SLUG)!;
    expect(s.row).toMatchObject({ id, status: "completed", commitSha: "abc123" });
    expect(s.lessons.length).toBe(built.lessons.length);
    expect(store.getFile(db, id, "src/db.ts")!.content).toContain("listProducts");
    expect(store.getFile(db, id, "../etc/passwd")).toBeNull();
  });

  it("a failed job is never completed and exposes no lessons", () => {
    store.ensureRepoStub(db, SLUG, "acme", "shop");
    const id = store.createAnalysis(db, SLUG, null);
    store.markProcessing(db, id);
    store.failAnalysis(db, id, "RATE_LIMITED", "GitHub's rate limit was reached", true);
    expect(store.getAnalysis(db, id)).toMatchObject({ status: "failed", errorCode: "RATE_LIMITED", retryable: true });
    expect(store.loadLatest(db, SLUG)).toBeNull();
    expect(() => store.completeLesson(db, "L", SLUG, "overview")).toThrow(ProgressError);
  });

  it("failAnalysis cannot overwrite a completed analysis", () => {
    const id = seed(db);
    store.failAnalysis(db, id, "X", "late failure", false);
    expect(store.getAnalysis(db, id)!.status).toBe("completed");
  });

  it("completeAnalysis is atomic: a bad payload leaves nothing half-saved", () => {
    store.ensureRepoStub(db, SLUG, "acme", "shop");
    const id = store.createAnalysis(db, SLUG, null);
    const circular: Record<string, unknown> = {}; circular.self = circular;
    expect(() => store.completeAnalysis(db, id, { commitSha: "x", analysis: circular as never, course: built.course, lessons: [], quizzes: [], files: fixtureIngestion.files })).toThrow();
    expect(store.getAnalysis(db, id)!.status).toBe("queued");
    expect(store.getFiles(db, id)).toHaveLength(0);
  });

  it("dedupes in-flight jobs and recovers stale ones", () => {
    store.ensureRepoStub(db, SLUG, "acme", "shop");
    const id = store.createAnalysis(db, SLUG, null);
    expect(store.findInFlight(db, SLUG)!.id).toBe(id);
    db.prepare("UPDATE analyses SET created_at = ? WHERE id = ?").run(new Date(Date.now() - 3_600_000).toISOString(), id);
    expect(store.recoverStale(db, 600_000)).toBe(1);
    expect(store.findInFlight(db, SLUG)).toBeNull();
    expect(store.getAnalysis(db, id)).toMatchObject({ status: "failed", errorCode: "INTERRUPTED", retryable: true });
  });
});

describe("quiz scoring is server-side", () => {
  it("scores from the stored quiz and returns explanations", () => {
    seed(db);
    const r = store.recordQuizAttempt(db, "L1", SLUG, "overview", answersFor("overview", true));
    expect(r).toMatchObject({ percent: 100, passed: true });
    expect(r.score).toBe(r.total);
    expect(r.results.every((x) => x.correct && x.explanation.length > 5)).toBe(true);
  });
  it("wrong answers score zero and are recorded", () => {
    seed(db);
    const r = store.recordQuizAttempt(db, "L1", SLUG, "overview", answersFor("overview", false));
    expect(r).toMatchObject({ score: 0, passed: false });
    expect(store.getGlobalProgress(db, "L1").totalQuizzesTaken).toBe(1);
  });
  it("unanswered questions count as wrong, never as right", () => {
    seed(db);
    const first = answersFor("overview", true).slice(0, 1);
    const r = store.recordQuizAttempt(db, "L1", SLUG, "overview", first);
    expect(r.score).toBe(1);
    expect(r.total).toBeGreaterThan(1);
  });
  it("rejects forged, duplicate and unknown answers", () => {
    seed(db);
    const a = answersFor("overview", true);
    for (const bad of [
      [{ questionId: "nope", selectedOptionId: "a" }],
      [{ ...a[0], selectedOptionId: "z" }],
      [a[0], a[0]],
    ]) expect(() => store.recordQuizAttempt(db, "L1", SLUG, "overview", bad)).toThrow(/do not match/);
    expect(() => store.recordQuizAttempt(db, "L1", SLUG, "no-such-lesson", a)).toThrow(ProgressError);
  });
  it("public quizzes never contain answers or explanations", () => {
    const pub = JSON.stringify(store.toPublicQuiz(built.quizzes[0]));
    expect(pub).not.toContain("correctOptionId");
    expect(pub).not.toContain("explanation");
  });
});

describe("completion rules", () => {
  it("does not complete a lesson with a quiz until the quiz is passed", () => {
    seed(db);
    expect(() => store.completeLesson(db, "L1", SLUG, "overview")).toThrow(/Pass the quiz/);
    store.recordQuizAttempt(db, "L1", SLUG, "overview", answersFor("overview", false));
    expect(() => store.completeLesson(db, "L1", SLUG, "overview")).toThrow(ProgressError);
    store.recordQuizAttempt(db, "L1", SLUG, "overview", answersFor("overview", true));
    expect(store.completeLesson(db, "L1", SLUG, "overview").completedAt).toBeTruthy();
    expect(PASS_PERCENT).toBe(60);
  });
  it("completion is idempotent and keeps the first timestamp", () => {
    seed(db);
    store.recordQuizAttempt(db, "L1", SLUG, "overview", answersFor("overview", true));
    const a = store.completeLesson(db, "L1", SLUG, "overview");
    const b = store.completeLesson(db, "L1", SLUG, "overview");
    expect(b.completedAt).toBe(a.completedAt);
    expect(store.getRepoProgress(db, "L1", SLUG)!.completedLessons).toBe(1);
  });
  it("rejects unknown lessons", () => {
    seed(db);
    expect(() => store.completeLesson(db, "L1", SLUG, "bogus")).toThrow(/Unknown lesson/);
  });
  it("lessons without a quiz can be completed explicitly", () => {
    const id = store.createAnalysis(db, SLUG, null);
    store.ensureRepoStub(db, SLUG, "acme", "shop");
    store.completeAnalysis(db, id, { commitSha: "s", analysis, course: built.course, lessons: built.lessons, quizzes: [], files: fixtureIngestion.files });
    expect(store.completeLesson(db, "L1", SLUG, "overview").completedAt).toBeTruthy();
  });
});

describe("progress", () => {
  it("computes percent, status and last lesson", () => {
    seed(db);
    store.touchVisit(db, "L1", SLUG, "layout");
    store.recordQuizAttempt(db, "L1", SLUG, "overview", answersFor("overview", true));
    store.completeLesson(db, "L1", SLUG, "overview");
    const p = store.getRepoProgress(db, "L1", SLUG)!;
    expect(p.totalLessons).toBe(built.lessons.length);
    expect(p.percentComplete).toBe(Math.round((1 / built.lessons.length) * 100));
    expect(p.lastLessonId).toBe("overview");
    expect(p.lessonProgress.find((l) => l.lessonId === "overview")).toMatchObject({ status: "completed" });
    expect(p.lessonProgress.find((l) => l.lessonId === "layout")!.status).toBe("not_started");
  });
  it("opening a lesson does not complete it", () => {
    seed(db);
    store.touchVisit(db, "L1", SLUG, "layout");
    const p = store.getRepoProgress(db, "L1", SLUG)!;
    expect(p.completedLessons).toBe(0);
    expect(p.lessonProgress.find((l) => l.lessonId === "layout")!.status).toBe("in_progress");
  });
  it("is isolated between learners", () => {
    seed(db);
    store.recordQuizAttempt(db, "A", SLUG, "overview", answersFor("overview", true));
    store.completeLesson(db, "A", SLUG, "overview");
    expect(store.getRepoProgress(db, "B", SLUG)).toBeNull();
    expect(store.getGlobalProgress(db, "B")).toMatchObject({ repos: [], totalQuizzesTaken: 0, totalLessonsCompleted: 0 });
  });
  it("reset clears one repo or everything, only for that learner", () => {
    seed(db);
    for (const l of ["A", "B"]) { store.recordQuizAttempt(db, l, SLUG, "overview", answersFor("overview", true)); store.completeLesson(db, l, SLUG, "overview"); }
    store.resetProgress(db, "A", SLUG);
    expect(store.getGlobalProgress(db, "A").repos).toHaveLength(0);
    expect(store.getGlobalProgress(db, "B").totalLessonsCompleted).toBe(1);
  });
  it("deleting a learner cascades", () => {
    seed(db);
    store.recordQuizAttempt(db, "A", SLUG, "overview", answersFor("overview", true));
    store.deleteLearner(db, "A");
    expect(db.prepare("SELECT COUNT(*) n FROM quiz_attempts").get()).toMatchObject({ n: 0 });
  });
});

describe("persistence across reopen (page refresh / restart)", () => {
  it("progress and analysis survive closing and reopening the database file", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rt-"));
    const file = path.join(dir, "t.sqlite");
    try {
      const first = openDb(file);
      seed(first);
      store.recordQuizAttempt(first, "L1", SLUG, "overview", answersFor("overview", true));
      store.completeLesson(first, "L1", SLUG, "overview");
      first.close();

      const second = openDb(file);
      const p = store.getRepoProgress(second, "L1", SLUG)!;
      expect(p.completedLessons).toBe(1);
      expect(p.bestScores.overview.score).toBeGreaterThan(0);
      expect(store.loadLatest(second, SLUG)!.row.commitSha).toBe("abc123");
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
