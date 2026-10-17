import { NextResponse } from "next/server";
import { z } from "zod";
import { AIError } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { findLatestCompleted, getFiles } from "@/lib/db/store";
import { AskError, MAX_QUESTION_CHARS, askTutor } from "@/lib/tutor/ask";
import { ApiError, assertSameOrigin, clientIp, errorResponse, nameSchema, ownerSchema, readJson } from "@/lib/server/http";
import { attachLearner, getOrCreateLearner } from "@/lib/server/learner";
import { enforce } from "@/lib/server/rateLimit";

const body = z.object({
  owner: ownerSchema,
  name: nameSchema,
  question: z.string().max(MAX_QUESTION_CHARS + 50),
  language: z.enum(["english", "hinglish"]).default("english"),
});

// One model request at a time per server process: small local models are CPU-bound.
const g = globalThis as unknown as { __rtAiBusy?: number };
const MAX_AI_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT ?? 1);

const AI_STATUS: Record<string, number> = {
  AI_TIMEOUT: 504,
  AI_UNAVAILABLE: 503,
  AI_MODEL_MISSING: 503,
  AI_BAD_RESPONSE: 502,
  AI_INVALID_OUTPUT: 502,
  AI_INPUT_TOO_LARGE: 413,
  AI_NOT_CONFIGURED: 503,
};

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const b = await readJson(req, body, 4_000);
    const learner = getOrCreateLearner(req);
    enforce(`ask:l:${learner.id}`, 20, 3_600_000, "tutor questions");
    enforce(`ask:ip:${clientIp(req)}`, 60, 3_600_000, "tutor questions");

    const db = getDb();
    const a = findLatestCompleted(db, `${b.owner}/${b.name}`.toLowerCase());
    if (!a) throw new ApiError(404, "NOT_ANALYZED", "Analyse this repository first.");
    const files = getFiles(db, a.id).map((f) => ({ path: f.path, content: f.content, language: f.language }));

    if ((g.__rtAiBusy ?? 0) >= MAX_AI_CONCURRENT) {
      throw new ApiError(429, "AI_BUSY", "The tutor is answering another question. Please try again in a moment.", { retryAfterSec: 15 });
    }
    g.__rtAiBusy = (g.__rtAiBusy ?? 0) + 1;
    try {
      const r = await askTutor({ files, question: b.question, language: b.language });
      return attachLearner(NextResponse.json({ ...r, commitSha: a.commitSha }), learner);
    } finally {
      g.__rtAiBusy = Math.max(0, (g.__rtAiBusy ?? 1) - 1);
    }
  } catch (e) {
    if (e instanceof AskError) return errorResponse(new ApiError(400, e.code, e.message));
    if (e instanceof AIError) {
      // Clear, honest failure. There is deliberately no fallback answer.
      return errorResponse(new ApiError(AI_STATUS[e.code] ?? 502, e.code, e.message, { retryable: e.retryable }));
    }
    return errorResponse(e);
  }
}
