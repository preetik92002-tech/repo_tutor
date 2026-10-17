import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { findLatestCompleted, loadAnalysis, touchVisit } from "@/lib/db/store";
import { assertSameOrigin, errorResponse, lessonIdSchema, nameSchema, ownerSchema, readJson } from "@/lib/server/http";
import { attachLearner, getOrCreateLearner } from "@/lib/server/learner";
import { enforce } from "@/lib/server/rateLimit";

const body = z.object({ owner: ownerSchema, name: nameSchema, lessonId: lessonIdSchema.optional() });

// Remembers "last visited lesson". Does NOT mark anything complete.
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const b = await readJson(req, body, 2_000);
    const learner = getOrCreateLearner(req);
    enforce(`visit:${learner.id}`, 240, 60_000, "requests");
    const slug = `${b.owner}/${b.name}`.toLowerCase();
    const db = getDb();
    const a = findLatestCompleted(db, slug);
    const stored = a ? loadAnalysis(db, a.id) : null;
    if (stored && (!b.lessonId || stored.lessons.some((l) => l.id === b.lessonId))) {
      touchVisit(db, learner.id, slug, b.lessonId ?? null);
    }
    return attachLearner(NextResponse.json({ ok: true }), learner);
  } catch (e) {
    return errorResponse(e);
  }
}
