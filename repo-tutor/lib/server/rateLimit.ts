import { ApiError } from "./http";

// Fixed-window in-memory limiter. Per-process only: with several server instances each has
// its own counters (documented limitation). Keys are bounded to avoid unbounded memory growth.

interface Bucket { count: number; resetAt: number }
const g = globalThis as unknown as { __rtBuckets?: Map<string, Bucket> };
const buckets = (g.__rtBuckets ??= new Map<string, Bucket>());
const MAX_KEYS = 10_000;

export function hit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  if (buckets.size > MAX_KEYS) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  if (buckets.size > MAX_KEYS) buckets.clear();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  return b.count <= limit ? { ok: true, retryAfterSec: 0 } : { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

export function enforce(key: string, limit: number, windowMs: number, what: string) {
  const r = hit(key, limit, windowMs);
  if (!r.ok) {
    throw new ApiError(429, "RATE_LIMITED", `Too many ${what}. Please wait about ${Math.ceil(r.retryAfterSec / 60)} minute(s) and try again.`, { retryAfterSec: r.retryAfterSec });
  }
}

export function resetRateLimits() { buckets.clear(); }
