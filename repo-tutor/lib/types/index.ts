// ============================================================
// Repo Tutor — Core TypeScript Interfaces
// These are the stable contracts between the frontend and
// the future backend. Replace the demo service implementations
// with real API calls without changing these types.
// ============================================================

export type LanguagePreference = "english" | "hinglish";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type LessonStatus = "completed" | "in_progress" | "not_started";
export type FileType = "file" | "directory";
export type RepoCategory = "frontend" | "backend" | "fullstack";

// ─── Repository ──────────────────────────────────────────────

export interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string; // "owner/name"
  description: string;
  stars: number;
  language: string;
  topics: string[];
  category: RepoCategory;
  githubUrl: string;
  isDemo: boolean;
}

// ─── Repository Tree ─────────────────────────────────────────

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: FileType;
  children?: TreeNode[];
  language?: string;
}

// ─── Code ────────────────────────────────────────────────────

export interface CodeSnippet {
  filename: string;
  path: string;
  language: string;
  content: string;
  highlightedLines?: number[];
}

export interface ImportantFunction {
  name: string;
  description: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface FileExplanation {
  path: string;
  summary: string;
  importantFunctions: ImportantFunction[];
  relatedFiles: string[];
}

// ─── Learning Path ───────────────────────────────────────────

export interface LearningPathItem {
  id: string;
  lessonNumber: number;
  title: string;
  objective: string;
  estimatedMinutes: number;
  status: LessonStatus;
}

// ─── Lesson ──────────────────────────────────────────────────

export interface LessonSection {
  type: "explanation" | "code" | "objectives" | "breakdown" | "takeaways" | "exercise";
  content: string;
  codeSnippet?: CodeSnippet;
  items?: string[];
}

export interface Lesson {
  id: string;
  repoId: string;
  lessonNumber: number;
  title: string;
  objective: string;
  estimatedMinutes: number;
  status: LessonStatus;
  sections: LessonSection[];
}

// ─── Quiz ────────────────────────────────────────────────────

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export interface Quiz {
  lessonId: string;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface QuizResult {
  lessonId: string;
  answers: QuizAnswer[];
  score: number;
  total: number;
  completedAt: string;
}

// ─── Course ──────────────────────────────────────────────────

export interface Course {
  repoId: string;
  title: string;
  description: string;
  objectives: string[];
  totalLessons: number;
  estimatedHours: number;
  learningPath: LearningPathItem[];
  language: LanguagePreference;
  skillLevel: SkillLevel;
}

// ─── Progress ────────────────────────────────────────────────

export interface LessonProgress {
  lessonId: string;
  status: LessonStatus;
  quizResult?: QuizResult;
  completedAt?: string;
}

export interface RepoProgress {
  repoId: string;
  repoFullName: string;
  repoDescription: string;
  completedLessons: number;
  totalLessons: number;
  percentComplete: number;
  lastAccessedAt: string;
  lessonProgress: LessonProgress[];
}

export interface GlobalProgress {
  repos: RepoProgress[];
  totalLessonsCompleted: number;
  totalQuizzesTaken: number;
}

// ─── Tutor ───────────────────────────────────────────────────

export interface SourceCitation {
  filename: string;
  path: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[];
  timestamp: string;
}
