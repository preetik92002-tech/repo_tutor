import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { GitHubError, parseRepoUrl, repoSlug } from "@/lib/github/url";
import { startAnalysis } from "@/lib/jobs/analysisRunner";
import { ApiError, assertSameOrigin, clientIp, errorResponse, readJson } from "@/lib/server/http";
import { attachLearner, getOrCreateLearner } from "@/lib/server/learner";
import { enforce } from "@/lib/server/rateLimit";

const body = z.object({ url: z.string().max(400) });

// Submit a public GitHub repository. Returns immediately; poll GET /api/analyze/:id for status.
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { url } = await readJson(req, body, 2_000);
    let ref;
    try {
      ref = parseRepoUrl(url);
    } catch (e) {
      if (e instanceof GitHubError) throw new ApiError(400, e.code, e.message);
      throw e;
    }
    const learner = getOrCreateLearner(req);
    enforce(`analyze:l:${learner.id}`, 8, 3_600_000, "analysis requests");
    enforce(`analyze:ip:${clientIp(req)}`, 30, 3_600_000, "analysis requests");

    const r = startAnalysis(getDb(), ref, learner.id);
    const res = NextResponse.json(
      { id: r.id, status: r.status, cached: r.cached, repo: { owner: ref.owner, name: ref.name, slug: repoSlug(ref) } },
      { status: r.status === "completed" ? 200 : 202 },
    );
    return attachLearner(res, learner);
  } catch (e) {
    return errorResponse(e);
  }
}
