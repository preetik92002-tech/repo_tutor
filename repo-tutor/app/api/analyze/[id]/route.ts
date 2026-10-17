import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAnalysis } from "@/lib/db/store";
import { ApiError, errorResponse } from "@/lib/server/http";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!/^\d{1,9}$/.test(id)) throw new ApiError(400, "BAD_REQUEST", "Invalid analysis id.");
    const a = getAnalysis(getDb(), Number(id));
    if (!a) throw new ApiError(404, "NOT_FOUND", "Analysis not found.");
    const [owner, name] = a.repoSlug.split("/");
    return NextResponse.json(
      {
        id: a.id,
        status: a.status,
        repo: { owner, name },
        error: a.status === "failed" ? { code: a.errorCode, message: a.errorMessage, retryable: a.retryable } : undefined,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
