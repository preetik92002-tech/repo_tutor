# Repo Tutor 🚀
> *"Understand Any Codebase. Learn It Step by Step."*

Repo Tutor is a student-focused, AI-powered GitHub repository learning platform inspired by the playful, community-driven aesthetic of Hacktoberfest. Instead of overwhelming documentation dumps, it transforms public repositories into structured, ordered lessons, interactive quizzes, syntax-highlighted code walkthroughs, and progress tracking in English and Hinglish.

---

## 🎨 Design System & Visual Identity
- **Warm Cream (`#FFF8EC`)**: Primary page background.
- **Festival Orange (`#FF6B35`)**: Primary CTA and actionable highlights.
- **Electric Purple (`#7447EB`)**: Learning pathways, badges, and interactive sections.
- **Sunshine Yellow (`#FFD84D`)**: Accents and level badges.
- **Fresh Green (`#B8E986`)**: Completion status and success metrics.
- **Ink Black (`#202020`)**: High-contrast, readable typography.

---

## 🧭 Implemented Routes

| Route | Description |
|---|---|
| `/` | **Landing Page** with URL submission hero, inline validation, language/level selection, trust labels, featured courses, how-it-works steps, and feature breakdown. |
| `/explore` | **Explore Repositories** with real-time search, category filtering (Frontend, Backend, Full Stack), course badges, and empty states. |
| `/repo/[owner]/[name]` | **Repository Learning Dashboard** with course overview, syllabus timeline, progress indicators, objectives, and GitHub link. |
| `/repo/[owner]/[name]/lesson/[lessonId]` | **Interactive Lesson & Quiz** with sidebar navigation, breadcrumbs, English/Hinglish language switcher, syntax-highlighted code breakdowns, hands-on exercises, multiple-choice quiz with scoring/explanations/retry, and local progress persistence. |
| `/repo/[owner]/[name]/code` | **Code Explorer** featuring an expandable file tree with filename filtering, line-numbered syntax code viewer, file purpose summary, important functions breakdown, and clickable related file links. |
| `/progress` | **Learning Progress** tracking total lessons completed, quizzes taken, active repositories with visual progress bars, recent quiz score breakdowns, and state reset/load actions. |

---

## ⚙️ How to Install & Run

### Prerequisites
- Node.js 18+ (tested on Node v22.17.1)
- npm or yarn

### 1. Install Dependencies
```bash
cd repo-tutor
npm install --legacy-peer-deps
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Production Build
```bash
npm run build
npm run start
```

---

## 📁 Architecture & Service Layer

All repository data, lessons, file trees, and progress management are strictly separated from UI components behind typed service contracts.

- **Types**: `lib/types/index.ts`
- **Demo Data**: `lib/demo/data.ts`
- **Service Layer**: `lib/services/index.ts`
- **Components**:
  - `components/layout/` (Navbar, Footer)
  - `components/ui/` (Icons, Badge, ProgressBar, HeroForm)
  - `components/repository/` (RepoCard)
  - `components/course/` (LessonViewer)
  - `components/code-explorer/` (CodeBlock, CodeExplorer)
  - `components/quiz/` (QuizPanel)
  - `components/progress/` (ProgressView)

---

## 🔌 How a Future Backend Replaces Demo Services

The frontend service interface (`lib/services/index.ts`) is designed so that a real backend (e.g., built with Python, FastAPI, Node.js, Codex, Gemma, Mastra, or MongoDB) can replace demo functions without altering component props or route contracts:

1. **`parseGitHubUrl(url)`**: Validate and sanitize GitHub repository URLs.
2. **`getDemoRepository(owner, name)`** ➔ Replace with `fetchRepositoryMetadata(owner, name)` calling GitHub API or your backend repository cache.
3. **`getCourse(owner, name)`** ➔ Replace with `GET /api/repos/:owner/:name/course` which generates or returns the structured curriculum.
4. **`getLesson(lessonId)`** ➔ Replace with `GET /api/lessons/:lessonId` returning AI-generated explanations, code breakdowns, and exercises.
5. **`getQuiz(lessonId)`** ➔ Replace with `GET /api/lessons/:lessonId/quiz` retrieving dynamically generated assessment questions.
6. **`getFileTree(owner, name)`** ➔ Replace with `GET /api/repos/:owner/:name/tree` querying GitHub Git Trees API.
7. **`getCodeFile(path)` & `getFileExplanation(path)`** ➔ Replace with `GET /api/repos/:owner/:name/files?path=...` returning file contents and AI tutor annotations.
8. **`getGlobalProgress()` / `saveGlobalProgress()`** ➔ Replace `localStorage` with authenticated user profile endpoints (`GET /api/user/progress` and `POST /api/user/progress`).

---

## ⚠️ Demo Mode Limitations
- Repo Tutor currently operates in **demo mode** with curated local sample repositories (`facebook/react`, `vercel/next.js`, `expressjs/express`, `vuejs/vue`, `fastapi/fastapi`, `remix-run/remix`).
- No live network requests to GitHub API or external LLM models are made.
- Learning progress is persisted in the browser via `localStorage`.
