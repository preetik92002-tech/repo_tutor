# Repo Tutor

> Understand an unfamiliar GitHub repository, step by step.

Repo Tutor reads a **public GitHub repository**, works out its structure, and turns what it finds into a short guided course: lessons, line-numbered code excerpts, a quiz per lesson, and saved progress, in English or Hinglish. An optional, clearly labelled "Ask the tutor" feature uses a small **open-weight model running locally through Ollama**.

**Who it is for:** students and junior developers who open an unfamiliar repository and don't know where to start.

> Visual style is Hacktoberfest-*inspired* (cream, orange, purple, yellow, green, Mochi-sensei). Repo Tutor is **not** affiliated with or endorsed by Hacktoberfest.

## What is real, and what is not

| Feature | How it works | Uses an AI model? |
|---|---|---|
| Repository ingestion | GitHub REST API + raw file downloads, pinned to a commit SHA, with size/file limits and secret/binary/dependency exclusion. Repository code is **never executed**. | No |
| Analysis (languages, dependencies, entry points, imports, reading order) | Pattern matching over the files that were read. Each claim carries a file + line range. | No |
| Lessons and quizzes | Templates filled with the analysis facts. Code excerpts are verbatim with real line numbers; quiz answers are facts from the files. | No |
| English / Hinglish | Fixed template text in both languages; identifiers and file names stay unchanged. | No |
| Code Explorer | Shows the stored, secret-redacted files and facts from the analysis. | No |
| Progress, quiz scoring | Stored in SQLite; scoring happens on the server. | No |
| **Ask the tutor (experimental)** | Local model via Ollama, answers checked against the real source and labelled. | **Yes** |
| Sample courses (`/explore`) | Bundled demo content, labelled "Demo". Not a live analysis. | No |

**Model limitations:** the two 1B models tested were not reliable enough to teach code on their own (see [docs/AI_MODEL_EVALUATION.md](docs/AI_MODEL_EVALUATION.md)). That is why the course does not depend on a model, and why every tutor answer is verified and labelled. A verified citation proves the quoted code is on the cited lines, **not** that the explanation is right.

## Quick start

Requirements: **Node.js ≥ 22.13** (uses built-in `node:sqlite`, which Node still marks experimental), npm.

```bash
cd repo-tutor
npm install --legacy-peer-deps
cp .env.example .env.local        # optional: defaults work
npm run dev                       # http://localhost:3000
```

Paste a public GitHub URL on the home page. Analysis needs internet access to GitHub (60 API requests/hour without a token; each analysis uses 3). Lessons, quizzes, Code Explorer and progress work **without Ollama**.

### Optional: the AI tutor (Ollama)

```bash
# install Ollama from https://ollama.com/download, then:
ollama pull gemma3:1b             # ~0.8 GB; default AI_MODEL
curl http://localhost:3000/api/ai/health      # {"ok":true,...} when reachable and installed
npm run ai:smoke                  # sends one real prompt to the configured model
```

On Windows you can keep models off `C:` with the `OLLAMA_MODELS` environment variable (set it **before** starting Ollama). Expect **30 – 90 s per answer on a CPU-only laptop**. If Ollama is not running, the tutor shows a clear error; nothing is faked.

**Licences:** `gemma3:1b` is under the Gemma Terms of Use; `qwen2.5-coder:1.5b` is Apache-2.0. Details and sources in [docs/AI_MODEL_EVALUATION.md](docs/AI_MODEL_EVALUATION.md). Repo Tutor does not redistribute weights.

## Architecture and data flow

```
URL ─▶ POST /api/analyze ─▶ job runner (in-process, max N concurrent, timeout)
        validate (strict host)   GitHubClient ─▶ api.github.com + raw.githubusercontent.com
                                 filter files (binary/deps/lockfiles/secret names), redact secret-looking values
                                 analyzeRepository ─▶ buildCourse (lessons + quizzes)
                                 SQLite: analyses, analysis_files, ...   (atomic; failure ≠ completed)
Browser polls GET /api/analyze/:id ─▶ /repo/:owner/:name (server components read SQLite)
Lesson quiz ─▶ POST /api/progress/quiz  (server scores)  ─▶ POST /api/progress/complete (needs a pass)
Ask ─▶ POST /api/ask ─▶ select bounded context ─▶ Ollama (JSON schema) ─▶ citation verifier ─▶ labelled answer
```

Key modules: `lib/github` (URL, filters, client), `lib/analysis` (symbols, analyze, course), `lib/grounding` (citation verifier), `lib/ai` (replaceable provider + validated output), `lib/tutor`, `lib/db` (migrations + store), `lib/jobs`, `lib/server` (cookies, rate limits, HTTP helpers), `app/api/*`.

## Database

SQLite file at `DATABASE_PATH` (default `data/repo-tutor.sqlite`, git-ignored). Migrations are in `lib/db/migrations.ts`, are append-only, run automatically on first connection and are recorded in `schema_migrations`. Tables: `repos`, `analyses` (with commit SHA and status), `analysis_files`, `learners`, `lesson_progress`, `quiz_attempts`, `repo_visits`. Analysed repositories are cached for `ANALYSIS_TTL_HOURS` (24); a newer commit is picked up on the next analysis after that.

**Hosting caveat:** SQLite needs a persistent disk. On hosts with an ephemeral filesystem (including the default for many free tiers) data is lost on redeploy. Use a mounted volume or switch the store.

## Environment variables

See [.env.example](.env.example); every variable has a default. `GITHUB_TOKEN`, if set, is only sent to `api.github.com`. No secret is exposed to the browser.

## Tests and checks

```bash
npx tsc --noEmit      # types
npm run lint
npm test              # vitest: unit + integration, all with fake GitHub / scripted model
npm run build
npm run ai:smoke      # REAL model (needs Ollama), not part of npm test
```

`npm test` never talks to GitHub or a model. Scripted/faked providers appear **only** in tests. Real-network and real-model checks are the scripts in `scripts/` and the manual journey in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Security notes

* Strict URL parsing: only `https://github.com/<owner>/<repo>`; requests go only to two fixed hosts (no SSRF); redirects are refused.
* Repository text is untrusted: never executed, never put in the system prompt, wrapper tags are neutralised, context is bounded.
* Excluded: `node_modules`/build output, binaries, lockfiles, minified bundles, likely secret files (`.env*`, keys, tfvars…); secret-looking values in other files are redacted.
* Request bodies are size-capped and schema-validated; same-origin check on all mutations; in-memory rate limits (per process).
* Quiz answers are never sent to the browser before submission; scoring and completion rules are server-side.

## Known limitations

* **No accounts.** Progress belongs to an anonymous HttpOnly cookie; clearing cookies loses it, and anyone holding the cookie can see it. Not suitable for multi-user guarantees.
* Only **one skill level** (beginner) exists; the old level selector was removed because it did nothing.
* Analysis reads at most ~40 key files / 600 KB per repository; symbol and import detection is regex-based (JS/TS, Python, Go, Rust, Java-like); other languages get file-level facts only. Monorepos are shallowly covered.
* Quiz questions are factual ("which file…", "which line…"), not conceptual.
* No semantic (embedding) search; the Code Explorer filters by file name only.
* Unknown lesson URLs render a not-found page with HTTP 200 (streaming), marked `noindex`.
* Rate limits and the AI concurrency guard are per process.
* `node:sqlite` is experimental in Node 22.
* No payments, authentication, admin dashboard or analytics yet.
* The UI journey was verified over HTTP and with component-level checks, **not** with an automated browser test suite.

## Routes

`/` landing · `/explore` samples + analysed repos · `/repo/[owner]/[name]` dashboard · `…/lesson/[lessonId]` · `…/code` · `/progress` · API: `/api/analyze`, `/api/analyze/[id]`, `/api/ask`, `/api/progress[/quiz|/complete|/visit]`, `/api/repo/[owner]/[name]/file`, `/api/ai/health`.
