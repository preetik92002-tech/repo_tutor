// Source-grounding verification for model answers.
//
// What this proves: each accepted citation points at a real file, a sane line
// range, contains the model's verbatim quote, and contains the code identifiers
// the claim names.
// What it does NOT prove: that the explanation is semantically correct. A
// citation can pass and the prose can still be wrong, which is why callers must
// label results via `AnswerVerification.status` and never present small-model
// output as authoritative.

import { z } from "zod";

export interface SourceFile {
  path: string;
  content: string;
}

export const citationSchema = z.object({
  path: z.string().min(1).max(300),
  startLine: z.number().int(),
  endLine: z.number().int(),
  /** Verbatim text copied from the cited lines. */
  quote: z.string().max(400),
});
export type Citation = z.infer<typeof citationSchema>;

export type RejectionReason =
  | "UNKNOWN_FILE"
  | "INVALID_RANGE" // non-positive / non-integer
  | "REVERSED_RANGE" // end < start
  | "OUT_OF_BOUNDS" // beyond end of file
  | "RANGE_TOO_LARGE"
  | "QUOTE_TOO_SHORT"
  | "QUOTE_NOT_IN_RANGE"
  | "CLAIM_UNSUPPORTED"; // identifiers named in the claim are absent from the cited lines

export const MAX_CITED_LINES = 60;
export const MIN_QUOTE_CHARS = 8;

export type CitationCheck = { ok: true } | { ok: false; reason: RejectionReason };

export function splitLines(content: string): string[] {
  return content.replace(/\r\n?/g, "\n").split("\n");
}

/** The numbering shown to the model. Verification uses the same split, so they cannot disagree. */
export function numberLines(content: string): string {
  const lines = splitLines(content);
  const width = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(width)}| ${l}`).join("\n");
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Identifiers a claim explicitly names: backticked tokens plus code-shaped words
 * (snake_case, CONSTANTS, camelCase, PascalCase with an inner capital).
 * Plain English words are never treated as anchors.
 */
export function extractAnchors(claim: string): string[] {
  const found = new Set<string>();
  for (const m of claim.matchAll(/`([^`\n]{2,80})`/g)) {
    const t = m[1].replace(/\(\)$/, "").trim();
    if (t) found.add(t);
  }
  const patterns = [
    /\b[A-Za-z$][A-Za-z0-9$]*_[A-Za-z0-9_$]+\b/g, // snake_case / SCREAMING_CASE
    /\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/g, // camelCase
    /\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/g, // PascalCase with inner capital
  ];
  for (const re of patterns) for (const m of claim.matchAll(re)) found.add(m[0]);
  return [...found];
}

export function verifyCitation(files: ReadonlyMap<string, string> | SourceFile[], c: Citation, claim: string): CitationCheck {
  const map = Array.isArray(files) ? new Map(files.map((f) => [f.path, f.content])) : files;
  const content = map.get(c.path);
  if (content === undefined) return { ok: false, reason: "UNKNOWN_FILE" };

  if (!Number.isInteger(c.startLine) || !Number.isInteger(c.endLine) || c.startLine < 1 || c.endLine < 1) {
    return { ok: false, reason: "INVALID_RANGE" };
  }
  if (c.endLine < c.startLine) return { ok: false, reason: "REVERSED_RANGE" };
  const lines = splitLines(content);
  if (c.endLine > lines.length) return { ok: false, reason: "OUT_OF_BOUNDS" };
  if (c.endLine - c.startLine + 1 > MAX_CITED_LINES) return { ok: false, reason: "RANGE_TOO_LARGE" };

  const quote = norm(c.quote);
  if (quote.length < MIN_QUOTE_CHARS) return { ok: false, reason: "QUOTE_TOO_SHORT" };

  const rangeText = lines.slice(c.startLine - 1, c.endLine).join("\n");
  if (!norm(rangeText).includes(quote)) return { ok: false, reason: "QUOTE_NOT_IN_RANGE" };

  const anchors = extractAnchors(claim);
  if (anchors.length > 0) {
    const hit = anchors.filter((a) => rangeText.includes(a)).length;
    if (hit < Math.ceil(anchors.length / 2)) return { ok: false, reason: "CLAIM_UNSUPPORTED" };
  }
  return { ok: true };
}

export type VerificationStatus = "verified" | "partially_verified" | "unverified";

export interface AnswerVerification {
  status: VerificationStatus;
  accepted: Citation[];
  rejected: { citation: Citation; reason: RejectionReason }[];
}

/**
 * A claim is only `verified` when it has at least one citation and every
 * citation passes. Anything else is labelled, never silently trusted.
 */
export function verifyCitations(files: ReadonlyMap<string, string> | SourceFile[], citations: Citation[], claim: string): AnswerVerification {
  const accepted: Citation[] = [];
  const rejected: AnswerVerification["rejected"] = [];
  for (const c of citations) {
    const r = verifyCitation(files, c, claim);
    if (r.ok) accepted.push(c);
    else rejected.push({ citation: c, reason: r.reason });
  }
  const status: VerificationStatus =
    accepted.length === 0 ? "unverified" : rejected.length === 0 ? "verified" : "partially_verified";
  return { status, accepted, rejected };
}

export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  UNKNOWN_FILE: "cites a file that was not provided",
  INVALID_RANGE: "has an invalid line number",
  REVERSED_RANGE: "has an end line before its start line",
  OUT_OF_BOUNDS: "points past the end of the file",
  RANGE_TOO_LARGE: "cites too many lines to be specific",
  QUOTE_TOO_SHORT: "has no meaningful quote",
  QUOTE_NOT_IN_RANGE: "quotes text that is not on the cited lines",
  CLAIM_UNSUPPORTED: "does not contain the code the answer names",
};
