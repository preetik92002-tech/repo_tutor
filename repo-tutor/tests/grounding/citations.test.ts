import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { extractAnchors, numberLines, verifyCitation, verifyCitations, splitLines } from "@/lib/grounding/citations";

const content = [
  "export function add(a: number, b: number) {", // 1
  "  return a + b;", // 2
  "}", // 3
  "",
  "export const MAX_RETRIES = 3;", // 5
  "export function fetchUser(id: string) {", // 6
  "  if (!id) throw new Error('AI_INPUT_TOO_LARGE');", // 7
  "  return db.users.find(id);", // 8
  "}", // 9
].join("\n");
const files = [{ path: "src/a.ts", content }];
const cite = (o: Partial<{ path: string; startLine: number; endLine: number; quote: string }> = {}) => ({
  path: "src/a.ts", startLine: 6, endLine: 8, quote: "if (!id) throw new Error", ...o,
});

describe("verifyCitation", () => {
  it("accepts a correct, supported citation", () => {
    expect(verifyCitation(files, cite(), "`fetchUser` throws AI_INPUT_TOO_LARGE when id is missing")).toEqual({ ok: true });
  });
  it("tolerates whitespace/CRLF differences in the quote", () => {
    const crlf = [{ path: "src/a.ts", content: content.replace(/\n/g, "\r\n") }];
    expect(verifyCitation(crlf, cite({ quote: "if  (!id)   throw new Error" }), "fetchUser guards id").ok).toBe(true);
  });
  it("rejects unknown files", () => {
    expect(verifyCitation(files, cite({ path: "src/b.ts" }), "x")).toEqual({ ok: false, reason: "UNKNOWN_FILE" });
  });
  it("rejects reversed ranges", () => {
    expect(verifyCitation(files, cite({ startLine: 8, endLine: 6 }), "x")).toEqual({ ok: false, reason: "REVERSED_RANGE" });
  });
  it("rejects zero, negative and fractional lines", () => {
    for (const bad of [0, -3, 1.5]) {
      expect(verifyCitation(files, cite({ startLine: bad }), "x")).toEqual({ ok: false, reason: "INVALID_RANGE" });
    }
  });
  it("rejects ranges beyond the end of the file", () => {
    expect(verifyCitation(files, cite({ endLine: 10 }), "x")).toEqual({ ok: false, reason: "OUT_OF_BOUNDS" });
  });
  it("rejects over-broad ranges", () => {
    const big = [{ path: "big.ts", content: Array.from({ length: 200 }, (_, i) => `const v${i} = ${i};`).join("\n") }];
    expect(verifyCitation(big, { path: "big.ts", startLine: 1, endLine: 100, quote: "const v1 = 1;" }, "x")).toEqual({ ok: false, reason: "RANGE_TOO_LARGE" });
  });
  it("rejects empty or trivial quotes", () => {
    expect(verifyCitation(files, cite({ quote: "" }), "x")).toEqual({ ok: false, reason: "QUOTE_TOO_SHORT" });
    expect(verifyCitation(files, cite({ quote: "if" }), "x")).toEqual({ ok: false, reason: "QUOTE_TOO_SHORT" });
  });
  it("rejects a quote that exists elsewhere in the file but not on the cited lines", () => {
    // 'return a + b;' is on line 2, not 6-8: a line-number-only check would wrongly pass this.
    expect(verifyCitation(files, cite({ quote: "return a + b;" }), "x")).toEqual({ ok: false, reason: "QUOTE_NOT_IN_RANGE" });
  });
  it("rejects invented quotes", () => {
    expect(verifyCitation(files, cite({ quote: "await sendEmail(user)" }), "x")).toEqual({ ok: false, reason: "QUOTE_NOT_IN_RANGE" });
  });
  it("rejects a valid range that does not support what the claim names", () => {
    // Lines 1-3 are real and the quote is real, but the claim is about fetchUser/MAX_RETRIES.
    const r = verifyCitation(files, cite({ startLine: 1, endLine: 3, quote: "return a + b;" }), "`fetchUser` retries up to MAX_RETRIES times");
    expect(r).toEqual({ ok: false, reason: "CLAIM_UNSUPPORTED" });
  });
});

describe("extractAnchors", () => {
  it("finds code-shaped identifiers and ignores ordinary words", () => {
    const a = extractAnchors("The `fetchUser()` function throws AI_INPUT_TOO_LARGE via AbortController, not The Thing.");
    expect(a).toEqual(expect.arrayContaining(["fetchUser", "AI_INPUT_TOO_LARGE", "AbortController"]));
    expect(a).not.toContain("The");
    expect(a).not.toContain("Thing");
  });
});

describe("verifyCitations status", () => {
  const claim = "`fetchUser` throws when id is missing";
  it("verified only when all citations pass", () => {
    expect(verifyCitations(files, [cite()], claim).status).toBe("verified");
  });
  it("partially_verified when some fail", () => {
    const r = verifyCitations(files, [cite(), cite({ startLine: 8, endLine: 6 })], claim);
    expect(r.status).toBe("partially_verified");
    expect(r.rejected[0].reason).toBe("REVERSED_RANGE");
  });
  it("unverified when none pass or none are given", () => {
    expect(verifyCitations(files, [cite({ path: "nope.ts" })], claim).status).toBe("unverified");
    expect(verifyCitations(files, [], claim).status).toBe("unverified");
  });
});

describe("numberLines", () => {
  it("numbering matches the verifier's line split exactly", () => {
    const numbered = numberLines(content).split("\n");
    expect(numbered.length).toBe(splitLines(content).length);
    expect(numbered[5]).toMatch(/^ ?6\| export function fetchUser/);
  });
});

describe("regression: the real benchmark failure", () => {
  // gemma3:1b cited lines 12-10 and lines that did not contain the timeout logic.
  const src = readFileSync("lib/ai/ollama.ts", "utf8");
  const f = [{ path: "lib/ai/ollama.ts", content: src }];
  it("rejects the reversed 12-10 range", () => {
    expect(verifyCitation(f, { path: "lib/ai/ollama.ts", startLine: 12, endLine: 10, quote: "interface OllamaChatResponse" }, "health() checks installed models")).toEqual({ ok: false, reason: "REVERSED_RANGE" });
  });
  it("rejects imports cited as the timeout mechanism", () => {
    const r = verifyCitation(f, { path: "lib/ai/ollama.ts", startLine: 1, endLine: 8, quote: "type AICompletionRequest," }, "The request is stopped by `AbortController` and `setTimeout`");
    expect(r).toEqual({ ok: false, reason: "CLAIM_UNSUPPORTED" });
  });
  it("accepts the genuine timeout lines", () => {
    const idx = splitLines(src).findIndex((l) => l.includes("setTimeout(() => controller.abort"));
    const r = verifyCitation(f, { path: "lib/ai/ollama.ts", startLine: idx, endLine: idx + 2, quote: "setTimeout(() => controller.abort" }, "The request is stopped by `AbortController` and `setTimeout`");
    expect(r).toEqual({ ok: true });
  });
});
