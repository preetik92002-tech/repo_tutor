import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getGlobalProgress, resetProgress } from "@/lib/db/store";
import { assertSameOrigin, errorResponse, nameSchema, ownerSchema } from "@/lib/server/http";
import { readLearnerId } from "@/lib/server/learner";

export async function GET(req: Request) {
  try {
    const id = readLearnerId(req.headers.get("cookie"));
    const empty = { repos: [], totalLessonsCompleted: 0, totalQuizzesTaken: 0 };
    return NextResponse.json(id ? getGlobalProgress(getDb(), id) : empty, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

// Reset all progress, or one repository with ?repo=owner/name
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const id = readLearnerId(req.headers.get("cookie"));
    const repo = new URL(req.url).searchParams.get("repo");
    let slug: string | undefined;
    if (repo) {
      const [o, n] = z.tuple([ownerSchema, nameSchema]).parse(repo.split("/"));
      slug = `${o}/${n}`.toLowerCase();
    }
    if (id) resetProgress(getDb(), id, slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
