import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { findLatestCompleted, getFile } from "@/lib/db/store";
import { ApiError, errorResponse, nameSchema, ownerSchema } from "@/lib/server/http";
import { isSafePath } from "@/lib/github/filters";

// Returns a stored (already filtered + secret-redacted) source file for the Code Explorer.
export async function GET(req: Request, ctx: { params: Promise<{ owner: string; name: string }> }) {
  try {
    const p = await ctx.params;
    const owner = ownerSchema.parse(p.owner);
    const name = nameSchema.parse(p.name);
    const path = new URL(req.url).searchParams.get("path") ?? "";
    if (!isSafePath(path)) throw new ApiError(400, "BAD_REQUEST", "Invalid file path.");
    const db = getDb();
    const a = findLatestCompleted(db, `${owner}/${name}`.toLowerCase());
    if (!a) throw new ApiError(404, "NOT_ANALYZED", "This repository has not been analysed yet.");
    const f = getFile(db, a.id, path);
    if (!f) throw new ApiError(404, "NOT_FOUND", "That file was not part of the analysis.");
    return NextResponse.json(
      { path: f.path, language: f.language, size: f.size, content: f.content, commitSha: a.commitSha },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
