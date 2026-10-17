import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { loadAIConfig } from "@/lib/ai/config";
import { OllamaProvider } from "@/lib/ai/ollama";
import { AIError, generateStructured } from "@/lib/ai";

const cfg = loadAIConfig({ AI_TIMEOUT_MS: "1000", AI_MAX_INPUT_CHARS: "600" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const reply = (text: string) => json({ model: "m", message: { content: text }, eval_count: 5, prompt_eval_count: 7 });
const msgs = [{ role: "user" as const, content: "hi" }];

describe("config", () => {
  it("applies defaults and rejects invalid values", () => {
    expect(loadAIConfig({}).AI_MODEL).toBe("gemma3:1b");
    expect(() => loadAIConfig({ AI_BASE_URL: "nope" })).toThrow(/Invalid AI configuration/);
  });
});

describe("OllamaProvider.complete", () => {
  it("returns text and token counts, sending bounded options", async () => {
    const f = vi.fn().mockResolvedValue(reply("ok"));
    const r = await new OllamaProvider(cfg, f).complete({ messages: msgs, maxOutputTokens: 999999 });
    expect(r).toMatchObject({ text: "ok", outputTokens: 5, promptTokens: 7 });
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.options.num_predict).toBe(cfg.AI_MAX_OUTPUT_TOKENS);
    expect(body.stream).toBe(false);
  });
  it("rejects oversized input before any network call", async () => {
    const f = vi.fn();
    await expect(
      new OllamaProvider(cfg, f).complete({ messages: [{ role: "user", content: "x".repeat(601) }] }),
    ).rejects.toMatchObject({ code: "AI_INPUT_TOO_LARGE" });
    expect(f).not.toHaveBeenCalled();
  });
  it("maps connection failure to AI_UNAVAILABLE without leaking the URL", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const e = await new OllamaProvider(cfg, f).complete({ messages: msgs }).catch((x) => x);
    expect(e).toBeInstanceOf(AIError);
    expect(e.code).toBe("AI_UNAVAILABLE");
    expect(e.message).not.toContain("127.0.0.1");
  });
  it("maps timeouts to AI_TIMEOUT", async () => {
    const short = loadAIConfig({ AI_TIMEOUT_MS: "1000" });
    const f = vi.fn((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(new Error("aborted")))),
    );
    await expect(
      new OllamaProvider(short, f as unknown as typeof fetch).complete({ messages: msgs }),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
  });
  it("maps 404 to AI_MODEL_MISSING, 500 to retryable AI_BAD_RESPONSE, empty text to error", async () => {
    await expect(new OllamaProvider(cfg, vi.fn().mockResolvedValue(json({}, 404))).complete({ messages: msgs }))
      .rejects.toMatchObject({ code: "AI_MODEL_MISSING" });
    await expect(new OllamaProvider(cfg, vi.fn().mockResolvedValue(json({}, 500))).complete({ messages: msgs }))
      .rejects.toMatchObject({ code: "AI_BAD_RESPONSE", retryable: true });
    await expect(new OllamaProvider(cfg, vi.fn().mockResolvedValue(reply(""))).complete({ messages: msgs }))
      .rejects.toMatchObject({ code: "AI_BAD_RESPONSE" });
  });
});

describe("OllamaProvider.health", () => {
  it("reports installed / missing / unreachable", async () => {
    const tags = (names: string[]) => vi.fn().mockResolvedValue(json({ models: names.map((name) => ({ name })) }));
    expect((await new OllamaProvider(cfg, tags(["gemma3:1b"])).health()).ok).toBe(true);
    expect((await new OllamaProvider(cfg, tags(["other"])).health())).toMatchObject({ ok: false, reachable: true });
    expect((await new OllamaProvider(cfg, vi.fn().mockRejectedValue(new Error("x"))).health())).toMatchObject({ reachable: false });
  });
});

describe("generateStructured", () => {
  const schema = z.object({ answer: z.string().min(1) });
  const make = (...texts: string[]) => {
    const f = vi.fn();
    texts.forEach((t) => f.mockResolvedValueOnce(reply(t)));
    return new OllamaProvider(cfg, f);
  };
  it("returns validated data", async () => {
    const r = await generateStructured({ provider: make('{"answer":"yes"}'), system: "s", user: "u", schema });
    expect(r.data.answer).toBe("yes");
  });
  it("retries once after invalid output, then succeeds", async () => {
    const r = await generateStructured({ provider: make("not json", '{"answer":"ok"}'), system: "s", user: "u", schema });
    expect(r.data.answer).toBe("ok");
  });
  it("throws AI_INVALID_OUTPUT instead of returning unvalidated data", async () => {
    await expect(
      generateStructured({ provider: make('{"wrong":1}', '{"wrong":2}'), system: "s", user: "u", schema }),
    ).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
  });
});
