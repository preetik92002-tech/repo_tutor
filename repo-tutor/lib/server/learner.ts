import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

// Anonymous learner identity: an opaque random id in an HttpOnly cookie.
// There are NO accounts: whoever holds the cookie holds the progress. See README "Known limitations".

export const LEARNER_COOKIE = "rt_learner";
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function readLearnerId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === LEARNER_COOKIE) {
      const val = v.join("=");
      return ID_RE.test(val) ? val : null;
    }
  }
  return null;
}

/** Existing id, or a fresh one that must be attached to the response with `attachLearner`. */
export function getOrCreateLearner(req: Request): { id: string; isNew: boolean } {
  const existing = readLearnerId(req.headers.get("cookie"));
  return existing ? { id: existing, isNew: false } : { id: randomUUID(), isNew: true };
}

export function attachLearner(res: NextResponse, learner: { id: string; isNew: boolean }): NextResponse {
  if (learner.isNew) {
    res.cookies.set(LEARNER_COOKIE, learner.id, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
