# Implementation status

Last updated: 2026-10-18. Branch `saas-build`. **Nothing from this work is committed or pushed yet** (by instruction).

## Scope (current)

Local-only, open-weight AI (Ollama). No hosted inference, no payments, no MongoDB, no accounts. SQLite for persistence.

## Done and verified

| Area | Evidence |
|---|---|
| Ollama installed (D:), two models pulled, real inference through `lib/ai` | `ollama list`, `/api/ai/health` → ok, benchmark + `/api/ask` runs (docs/AI_MODEL_EVALUATION.md) |
| Citation verification (exact file, range, quote, claim identifiers) | `tests/grounding`, `tests/tutor` |
| Model failure handling (timeout, unavailable, missing model, bad response, malformed JSON) → clear error, never a mock | `tests/ai`, `tests/tutor`; real `AI_INVALID_OUTPUT` surfaced by the live API |
| GitHub ingestion (URL validation, filters, secret redaction, rate limit, empty/private/huge repos) | `tests/github`; real run on `sindresorhus/p-limit` |
| Deterministic analysis, course and quiz generation | `tests/analysis` (snippets are verbatim excerpts; every `path:line` resolves; quiz answers true) |
| SQLite store + migrations, server-side scoring, completion rules, isolation, persistence across reopen | `tests/db` (on-disk file reopened) |
| Job runner (dedupe, TTL cache, failure ≠ completed, concurrency cap) | `tests/jobs` |
| UI wiring: landing → analysis → dashboard → lesson/quiz → Code Explorer → progress | HTTP journey against `next start` (below) |
| Removed fabricated content | Progress page no longer seeds fake "facebook/react 2 lessons" progress; Code Explorer demo no longer invents placeholder code/explanations |

## Last verification run (2026-10-18)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass (no output) |
| `npm run lint` | pass (the 1 error + 1 warning that existed at baseline were fixed) |
| `npm test` | **139 tests passed**, 7 files (all mocked/faked providers) |
| `npm run build` | pass |
| HTTP journey (`next start`, real GitHub, throwaway DB) | 20 of 22 checks passed; the 2 "failures" were test artefacts (see below); `/api/ask` returned a labelled `unverified` answer from the real model |

Journey checks that passed: live dashboard with commit SHA, no demo banner, quiz answers absent from page HTML, real file via API, path traversal → 400, excluded secret file → 404, cannot complete a quiz lesson without passing (409), wrong answers score 0, correct answers pass with explanations, forged answers → 400, completion after pass, visit ≠ completion, progress persists across a new request with the same cookie, other cookie sees nothing, cross-site POST → 403, reset works.

The two non-passes: the provenance string was split across React text nodes (the content is present), and an unknown lesson URL returns the not-found page with HTTP 200 because of streaming (documented).

## Not done / blockers

* **Browser-level E2E** (clicking through the UI, mobile layout, accessibility audit) has not been run. Only HTTP-level checks and component typing/lint.
* **Tutor quality**: 1B models are unreliable (see evaluation). Larger models untested.
* No auth/accounts, no payments, no admin, no analytics, no semantic search, only one skill level.
* No CSP header; basic hardening headers added.
* Dev dependency audit (`npm audit`) was not reviewed.
* Git: nothing committed. Existing commits `60046f0 endpoints` and `43eb689 landing page animation` were made outside this session and are untouched. Repo-local git identity is set to `Preeti Kumari <preetik92002@gmail.com>`.

## Next steps

1. Browser E2E pass + a11y check; fix findings.
2. Decide on a larger local model if hardware allows; re-run `scripts/ai-bench.ts`.
3. Review the diff and lockfile changes (`package-lock.json`, `yarn.lock`), then commit in small commits and push after inspecting the remote.
