import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ProgressError, completeLesson } from "@/lib/db/store";
import { ApiError, assertSameOrigin, errorResponse, lessonIdSchema, nameSchema, ownerSchema, readJson } from "@/lib/server/http";
import { attachLearner, getOrCreateLearner } from "@/lib/server/learner";
import { enforce } from "@/lib/server/rateLimit";

const body = z.object({ owner: ownerSchema, name: nameSchema, lessonId: lessonIdSchema });

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const b = await readJson(req, body, 2_000);
    const learner = getOrCreateLearner(req);
    enforce(`complete:${learner.id}`, 120, 60_000, "completion requests");
    try {
      const r = completeLesson(getDb(), learner.id, `${b.owner}/${b.name}`.toLowerCase(), b.lessonId);
      return attachLearner(NextResponse.json({ ok: true, ...r }), learner);
    } catch (e) {
      if (e instanceof ProgressError) throw new ApiError(e.code === "QUIZ_NOT_PASSED" ? 409 : 404, e.code, e.message);
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
}
