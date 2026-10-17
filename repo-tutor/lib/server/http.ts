import { NextResponse } from "next/server";
import { z } from "zod";

// Shared helpers for API route handlers (server-only).

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly extra?: Record<string, unknown>) {
    super(message);
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, ...e.extra } }, { status: e.status, headers: e.status === 429 && e.extra?.retryAfterSec ? { "retry-after": String(e.extra.retryAfterSec) } : undefined });
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "The request was not valid." } }, { status: 400 });
  }
  // Never leak internals: log server-side, return a generic message.
  console.error("[api] unexpected error:", e instanceof Error ? e.message : String(e));
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }, { status: 500 });
}

/** CSRF defence for cookie-authenticated mutations: the Origin (when sent) must match the Host. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients; SameSite=Lax cookie still protects browsers
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let ok = false;
  try { ok = new URL(origin).host === host; } catch { /* invalid */ }
  if (!ok) throw new ApiError(403, "FORBIDDEN_ORIGIN", "Cross-site requests are not allowed.");
}

/** Reads a JSON body with a hard size cap, then validates it. */
export async function readJson<T>(req: Request, schema: z.ZodType<T>, maxBytes = 20_000): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new ApiError(400, "BAD_JSON", "The request body must be valid JSON."); }
  return schema.parse(data);
}

export const ownerSchema = z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/);
export const nameSchema = z.string().regex(/^[A-Za-z0-9._-]{1,100}$/).refine((n) => n !== "." && n !== "..");
export const lessonIdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim().slice(0, 64);
}
