# AI model evaluation (local, Ollama)

This documents what was **actually measured** on the development machine, and what was not. Nothing here is a general benchmark.

## Test machine

| | |
|---|---|
| CPU | AMD Ryzen 5 5500U (6 cores), no dedicated GPU |
| RAM | 5.8 GB total; during the tests only a few hundred MB were free (a Next.js dev server and an editor were running) |
| Runtime | Ollama 0.40.6, 100% CPU inference, context 4096 |
| Models | `qwen2.5-coder:1.5b` (986 MB), `gemma3:1b` (806 MB), Q4_K_M quantisation |

Results from a loaded, memory-starved machine are **pessimistic for latency**. On a machine with a GPU or more free RAM, speeds will differ.

## Method

`scripts/ai-bench.ts` sends the same four questions to each model through the real provider layer (`lib/ai`), using one real source file (`lib/ai/ollama.ts`) with numbered lines and a strict JSON schema (answer + citations with line ranges). Two questions are English, two are Hinglish. Each response must pass schema validation (one retry allowed).

Sample size is **4 prompts per model, single run**. Treat the numbers as an illustration, not a statistically meaningful comparison.

## Results

| | qwen2.5-coder:1.5b | gemma3:1b |
|---|---|---|
| Valid structured JSON (after 1 retry) | 1 / 4 | 4 / 4 |
| Latency per answer | 30 s (the one success) | 12 – 52 s |
| Generation speed | ~2.2 tokens/s | ~3 – 15 tokens/s |
| Memory while loaded (`ollama ps`) | 1.2 GB | 883 MB |
| Factually correct answers (manual review) | the one success was a one-line fragment | about 1 of 4 |
| Citations that pointed at the right code | not assessable | poor |
| Hinglish quality | the single Hinglish answer contained no Hinglish words | 0 – 2 Hinglish words per answer; mostly English |

Observed gemma3:1b errors: said the input-size check happens after the timeout setup (it runs first); answered a Hinglish timeout question with an unrelated error name; produced a citation whose end line was before its start line; cited lines (imports) that did not contain the logic it described.

Follow-up through the shipped app (`POST /api/ask`, gemma3:1b, 3 000+ prompt tokens of real repository context):

* Latency was **31 – 89 s per question** on this CPU.
* The answer text to "What does the clearQueue function do?" was roughly right, but **all four citations pointed at wrong lines**. The verifier rejected every one and the API returned `status: "unverified"`.
* An earlier run returned `AI_INVALID_OUTPUT` (the model produced malformed JSON twice). The app surfaced that error; it did not substitute an answer.

## Conclusion

On this hardware, **neither 1B-class model is reliable enough to be presented as a code tutor.** gemma3:1b follows the JSON format reliably but makes factual and citation mistakes; qwen2.5-coder:1.5b fails the strict format most of the time.

How the product handles that:

* The learning path, lessons, quizzes and file explanations are built **deterministically from the repository's files** and do not call a model.
* The model only powers the optional, clearly labelled **"Ask the tutor (experimental)"** panel.
* Every tutor answer goes through `lib/grounding/citations.ts`. A citation is accepted only if the file exists, the line range is valid, the model's quote appears on those lines, and the identifiers the answer names appear there. Answers are labelled *Citations checked*, *Partly checked* or *Not verified*. Even *Citations checked* does **not** prove the explanation is correct.
* If the model is unreachable, slow, or returns invalid output, the user sees the error. There is no fallback text.

Larger open-weight models (for example 7B-class and up) would likely do better; **this was not tested** and no claim is made about them.

## Licences (verified from the pages below on 2026-10-17; not legal advice)

| Model | Licence | Notes |
|---|---|---|
| `qwen2.5-coder:1.5b` | Apache License 2.0 (as listed on its Ollama library page) | Permits commercial use, modification and redistribution with attribution and licence notice. Confirm on the upstream model card before redistributing weights. |
| `gemma3:1b` | Gemma Terms of Use (Ollama page: last modified 2024-02-21) | A custom licence, not an OSI open-source licence. Google's terms page does not explicitly forbid or grant "commercial use" but grants broad use rights subject to the Prohibited Use Policy, requires passing those restrictions and a copy of the terms to anyone you redistribute the model or derivatives to, and Google may restrict use it reasonably believes violates the terms. Read the full terms and policy before any commercial deployment. |

Sources: <https://ollama.com/library/gemma3:1b>, <https://ollama.com/library/qwen2.5-coder:1.5b>, <https://ai.google.dev/gemma/terms>.

Repo Tutor does not bundle or redistribute model weights; each operator downloads them with `ollama pull`.

## Choosing the model

The default in `.env.example` is `gemma3:1b` because it is the only one of the two that produced valid structured output in testing. It is a **default, not an endorsement of its answer quality**. Change `AI_MODEL` to any model your Ollama serves; if you have more capable hardware, try a larger model and re-run `npm run ai:bench`-style comparisons (`npx tsx scripts/ai-bench.ts <model> ...`).

## Reproduce

```bash
ollama pull gemma3:1b
ollama pull qwen2.5-coder:1.5b
npx tsx scripts/ai-bench.ts qwen2.5-coder:1.5b gemma3:1b > docs/ai-bench-raw.json   # git-ignored
npm run ai:smoke                                                                      # one real prompt
```
