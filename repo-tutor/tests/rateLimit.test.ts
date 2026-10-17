import { describe, it, expect } from "vitest";
import { hit } from "@/lib/server/rateLimit";

describe("rate limiter", () => {
  it("allows up to the limit then blocks with a retry time, per key", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(hit("k1", 3, 60_000, t).ok).toBe(true);
    const blocked = hit("k1", 3, 60_000, t + 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(59);
    expect(hit("other", 3, 60_000, t).ok).toBe(true);
  });
  it("resets after the window", () => {
    const t = 5_000_000;
    for (let i = 0; i < 2; i++) hit("k2", 2, 1000, t);
    expect(hit("k2", 2, 1000, t + 10).ok).toBe(false);
    expect(hit("k2", 2, 1000, t + 1001).ok).toBe(true);
  });
});
