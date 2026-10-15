// ============================================================
// Frontend Service Layer — stable interfaces for the backend
// Replace these demo implementations with real API calls.
// The function signatures and return types must not change.
// ============================================================

import type {
  Repository,
  Course,
  Lesson,
  Quiz,
  TreeNode,
  FileExplanation,
  CodeSnippet,
  GlobalProgress,
  RepoProgress,
  LessonProgress,
  LessonStatus,
  LanguagePreference,
  SkillLevel,
} from "../types";

import {
  DEMO_REPOSITORIES,
  DEMO_COURSES,
  DEMO_LESSONS,
  DEMO_QUIZZES,
  DEMO_TREES,
  DEMO_FILE_EXPLANATIONS,
  DEMO_CODE_FILES,
} from "../demo/data";

// ─── Repository ──────────────────────────────────────────────

/** Parse a GitHub URL and return { owner, name } or null */
export function parseGitHubUrl(url: string): { owner: string; name: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "");
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
    if (!match) return null;
    return { owner: match[1], name: match[2] };
  } catch {
    return null;
  }
}

/** Get a demo repository by owner + name. Returns null if not in demo set. */
export function getDemoRepository(owner: string, name: string): Repository | null {
  const id = buildRepoId(owner, name);
  return DEMO_REPOSITORIES.find((r) => r.id === id) ?? null;
}

/** Get all demo repositories, optionally filtered by category */
export function getAllRepositories(category?: string): Repository[] {
  if (!category || category === "all") return DEMO_REPOSITORIES;
  return DEMO_REPOSITORIES.filter((r) => r.category === category);
}

/** Search repositories by name or description */
export function searchRepositories(query: string): Repository[] {
  const q = query.toLowerCase();
  return DEMO_REPOSITORIES.filter(
    (r) =>
      r.fullName.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.topics.some((t) => t.includes(q))
  );
}

// ─── Course ──────────────────────────────────────────────────

/** Get the course for a repository. Returns null if not a demo repo. */
export function getCourse(owner: string, name: string): Course | null {
  const id = buildRepoId(owner, name);
  return DEMO_COURSES[id] ?? null;
}

// ─── Lessons ─────────────────────────────────────────────────

/** Get a single lesson by its ID */
export function getLesson(lessonId: string): Lesson | null {
  return DEMO_LESSONS[lessonId] ?? null;
}

/** Get all lessons for a repository */
export function getLessonsForRepo(owner: string, name: string): Lesson[] {
  const id = buildRepoId(owner, name);
  return Object.values(DEMO_LESSONS).filter((l) => l.repoId === id);
}

/** Get the quiz for a lesson */
export function getQuiz(lessonId: string): Quiz | null {
  return DEMO_QUIZZES[lessonId] ?? null;
}

// ─── Code Explorer ───────────────────────────────────────────

/** Get the file tree for a repository */
export function getFileTree(owner: string, name: string): TreeNode[] {
  const id = buildRepoId(owner, name);
  return DEMO_TREES[id] ?? [];
}

/** Get explanation for a file path */
export function getFileExplanation(filePath: string): FileExplanation | null {
  return DEMO_FILE_EXPLANATIONS[filePath] ?? null;
}

/** Get the code snippet for a file path */
export function getCodeFile(filePath: string): CodeSnippet | null {
  return DEMO_CODE_FILES[filePath] ?? null;
}

// ─── Progress (browser-persisted) ────────────────────────────

const PROGRESS_KEY = "repo_tutor_progress";

export function getGlobalProgress(): GlobalProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    return JSON.parse(raw) as GlobalProgress;
  } catch {
    return emptyProgress();
  }
}

export function saveGlobalProgress(progress: GlobalProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getRepoProgress(owner: string, name: string): RepoProgress | null {
  const id = buildRepoId(owner, name);
  const g = getGlobalProgress();
  return g.repos.find((r) => r.repoId === id) ?? null;
}

export function markLessonComplete(
  owner: string,
  name: string,
  lessonId: string,
  repoDescription: string
): void {
  const id = buildRepoId(owner, name);
  const g = getGlobalProgress();
  let repo = g.repos.find((r) => r.repoId === id);

  const course = getCourse(owner, name);
  const totalLessons = course?.totalLessons ?? 1;

  if (!repo) {
    repo = {
      repoId: id,
      repoFullName: `${owner}/${name}`,
      repoDescription,
      completedLessons: 0,
      totalLessons,
      percentComplete: 0,
      lastAccessedAt: new Date().toISOString(),
      lessonProgress: [],
    };
    g.repos.push(repo);
  }

  const existing = repo.lessonProgress.find((lp) => lp.lessonId === lessonId);
  if (!existing) {
    repo.lessonProgress.push({
      lessonId,
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  } else {
    existing.status = "completed";
    existing.completedAt = new Date().toISOString();
  }

  repo.completedLessons = repo.lessonProgress.filter((lp) => lp.status === "completed").length;
  repo.totalLessons = totalLessons;
  repo.percentComplete = Math.round((repo.completedLessons / totalLessons) * 100);
  repo.lastAccessedAt = new Date().toISOString();

  g.totalLessonsCompleted = g.repos.reduce((acc, r) => acc + r.completedLessons, 0);
  saveGlobalProgress(g);
}

export function saveLessonQuizResult(
  lessonId: string,
  score: number,
  total: number
): void {
  const g = getGlobalProgress();
  const lp = g.repos.flatMap((r) => r.lessonProgress).find((l) => l.lessonId === lessonId);
  if (lp) {
    lp.quizResult = {
      lessonId,
      answers: [],
      score,
      total,
      completedAt: new Date().toISOString(),
    };
    g.totalQuizzesTaken = g.repos
      .flatMap((r) => r.lessonProgress)
      .filter((lp) => lp.quizResult).length;
    saveGlobalProgress(g);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function buildRepoId(owner: string, name: string): string {
  return `${owner.toLowerCase()}-${name.toLowerCase().replace(/\./g, "-")}`;
}

function emptyProgress(): GlobalProgress {
  return { repos: [], totalLessonsCompleted: 0, totalQuizzesTaken: 0 };
}

/** Get lesson status from persisted progress or fall back to demo default */
export function getLessonStatus(
  owner: string,
  name: string,
  lessonId: string,
  defaultStatus: LessonStatus
): LessonStatus {
  const rp = getRepoProgress(owner, name);
  if (!rp) return defaultStatus;
  const lp = rp.lessonProgress.find((l) => l.lessonId === lessonId);
  return lp?.status ?? defaultStatus;
}
