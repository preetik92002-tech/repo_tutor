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
  LessonStatus,
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
  if (DEMO_LESSONS[lessonId]) return DEMO_LESSONS[lessonId];
  for (const course of Object.values(DEMO_COURSES)) {
    const item = course.learningPath.find((l) => l.id === lessonId);
    if (item) {
      return {
        id: item.id,
        repoId: course.repoId,
        lessonNumber: item.lessonNumber,
        title: item.title,
        objective: item.objective,
        estimatedMinutes: item.estimatedMinutes,
        status: item.status,
        sections: [
          {
            type: "explanation",
            content: `In this lesson, we study "${item.title}". You will explore how the maintainers designed this module, why these patterns were chosen, and how they fit into the broader system architecture.`,
            hinglishContent: `Is lesson mein hum "${item.title}" ko detail mein samjhenge. Maintainers ne is module ko kaise design kiya aur yeh overall system architecture mein kaise fit hota hai, yeh step-by-step explore karenge.`,
          },
          {
            type: "objectives",
            content: "Key objectives for this lesson:",
            items: [
              `Master the concepts behind ${item.title}`,
              "Examine the source code structure and core abstractions",
              "Follow open-source coding best practices",
            ],
            hinglishItems: [
              `${item.title} ke core concepts ko master karna`,
              "Source code structure aur core abstractions ko dekhna",
              "Open-source coding ke best practices follow karna",
            ],
          },
          {
            type: "code",
            content: `Core implementation pattern for ${item.title}:`,
            codeSnippet: {
              filename: `${item.id}.ts`,
              path: `src/${item.id}.ts`,
              language: "typescript",
              content: `// Repo Tutor — Lesson ${item.lessonNumber}: ${item.title}\nexport interface ConfigOptions {\n  enabled: boolean;\n  timeoutMs?: number;\n  debug?: boolean;\n}\n\nexport function initializeModule(options: ConfigOptions) {\n  if (!options.enabled) {\n    return null;\n  }\n  return {\n    ready: true,\n    timeout: options.timeoutMs ?? 5000,\n    initializedAt: new Date().toISOString(),\n  };\n}`,
            },
          },
          {
            type: "breakdown",
            content: "Important lines explained:",
            items: [
              "Lines 2-6: TypeScript interface specifies optional and required configuration",
              "Lines 8-11: Early return pattern handles disabled feature toggles cleanly",
              "Lines 12-16: Nullish coalescing provides safe fallback timeout values",
            ],
          },
          {
            type: "takeaways",
            content: "Key takeaways:",
            items: [
              "Favor early returns over deeply nested conditionals",
              "Use TypeScript interfaces to provide compile-time guarantees",
              "Document defaults and edge-case behaviors in code comments",
            ],
          },
          {
            type: "exercise",
            content: `Practical Exercise: Extend initializeModule to accept a custom logger callback and invoke it when options.debug is true.`,
          },
        ],
      };
    }
  }
  return null;
}

/** Get all lessons for a repository */
export function getLessonsForRepo(owner: string, name: string): Lesson[] {
  const id = buildRepoId(owner, name);
  const course = DEMO_COURSES[id];
  if (!course) return [];
  return course.learningPath.map((item) => getLesson(item.id)!);
}

/** Get the quiz for a lesson */
export function getQuiz(lessonId: string): Quiz | null {
  if (DEMO_QUIZZES[lessonId]) return DEMO_QUIZZES[lessonId];
  const lesson = getLesson(lessonId);
  if (!lesson) return null;
  return {
    lessonId,
    questions: [
      {
        id: `${lessonId}-q1`,
        question: `What is the core purpose of "${lesson.title}"?`,
        options: [
          { id: "a", text: lesson.objective },
          { id: "b", text: "To disable all type checking across the project" },
          { id: "c", text: "To overwrite configuration files without validation" },
          { id: "d", text: "To replace client rendering entirely" },
        ],
        correctOptionId: "a",
        explanation: `As detailed in the lesson objectives: "${lesson.objective}".`,
      },
      {
        id: `${lessonId}-q2`,
        question: "Why are typed interfaces beneficial in large open-source projects?",
        options: [
          { id: "a", text: "They inflate bundle size significantly" },
          { id: "b", text: "They provide contract clarity, catch typos, and enable IDE autocomplete" },
          { id: "c", text: "They prevent third-party contributions" },
          { id: "d", text: "They execute at runtime to block slow network requests" },
        ],
        correctOptionId: "b",
        explanation: "Typed interfaces clarify expectations between modules and eliminate entire classes of runtime errors before code is deployed.",
      },
      {
        id: `${lessonId}-q3`,
        question: "What is the recommended approach when modifying this module?",
        options: [
          { id: "a", text: "Commit without verifying existing tests or typings" },
          { id: "b", text: "Understand the control flow, maintain backwards compatibility, and test changes" },
          { id: "c", text: "Force compile errors to be ignored" },
          { id: "d", text: "Rewrite the build pipeline" },
        ],
        correctOptionId: "b",
        explanation: "Good open-source maintainers ensure changes preserve backward compatibility and are validated by automated test suites.",
      },
    ],
  };
}

// ─── Code Explorer ───────────────────────────────────────────

/** Get the file tree for a repository */
export function getFileTree(owner: string, name: string): TreeNode[] {
  const id = buildRepoId(owner, name);
  return DEMO_TREES[id] ?? [];
}

/** Get explanation for a file path */
export function getFileExplanation(filePath: string): FileExplanation {
  if (DEMO_FILE_EXPLANATIONS[filePath]) return DEMO_FILE_EXPLANATIONS[filePath];
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  return {
    path: filePath,
    summary: `Source file "${fileName}" in this repository. It provides key implementation logic and module exports used across the architecture.`,
    importantFunctions: [
      {
        name: fileName.replace(/\.[^/.]+$/, ""),
        description: `Primary export or handler associated with ${fileName}.`,
      },
      {
        name: "initialize",
        description: "Initializes the module runtime settings and dependencies.",
      },
    ],
    relatedFiles: parts.length > 1 ? [parts.slice(0, -1).join("/") + "/index.js"] : [],
  };
}

/** Get the code snippet for a file path */
export function getCodeFile(filePath: string): CodeSnippet {
  if (DEMO_CODE_FILES[filePath]) return DEMO_CODE_FILES[filePath];
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  const ext = fileName.split(".").pop() || "js";
  const lang = ext === "ts" || ext === "tsx" ? "typescript" : ext === "json" ? "json" : "javascript";
  return {
    filename: fileName,
    path: filePath,
    language: lang,
    content: `/**\n * Repo Tutor — Code Explorer\n * Path: ${filePath}\n */\n\n// Module configuration and public exports\nexport const VERSION = "1.0.0";\n\nexport function initialize(options = {}) {\n  console.log("Initializing ${fileName} with options:", options);\n  return {\n    status: "active",\n    timestamp: Date.now(),\n  };\n}\n\nexport default initialize;`,
  };
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
