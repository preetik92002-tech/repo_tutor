import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ProgressError, recordQuizAttempt } from "@/lib/db/store";
import { ApiError, assertSameOrigin, errorResponse, lessonIdSchema, nameSchema, ownerSchema, readJson } from "@/lib/server/http";
import { attachLearner, getOrCreateLearner } from "@/lib/server/learner";
import { enforce } from "@/lib/server/rateLimit";

const body = z.object({
  owner: ownerSchema,
  name: nameSchema,
  lessonId: lessonIdSchema,
  answers: z.array(z.object({ questionId: z.string().max(200), selectedOptionId: z.string().max(4) })).max(20),
});

// The browser sends only the chosen option ids; scoring happens here, against the stored quiz.
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const b = await readJson(req, body);
    const learner = getOrCreateLearner(req);
    enforce(`quiz:${learner.id}`, 120, 60_000, "quiz submissions");
    try {
      const result = recordQuizAttempt(getDb(), learner.id, `${b.owner}/${b.name}`.toLowerCase(), b.lessonId, b.answers);
      return attachLearner(NextResponse.json(result), learner);
    } catch (e) {
      if (e instanceof ProgressError) {
        throw new ApiError(e.code === "INVALID_ANSWERS" ? 400 : 404, e.code, e.message);
      }
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
}
