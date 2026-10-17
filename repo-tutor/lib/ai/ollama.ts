import {
  AIError,
  type AICompletionRequest,
  type AICompletionResult,
  type AIHealth,
  type AIProvider,
} from "./types";
import type { AIConfig } from "./config";

type Fetch = typeof fetch;

interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly model: string;

  constructor(
    private readonly cfg: AIConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    this.model = cfg.AI_MODEL;
  }

  private url(path: string) {
    return new URL(path, this.cfg.AI_BASE_URL).toString();
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    const total = req.messages.reduce((n, m) => n + m.content.length, 0);
    if (total > this.cfg.AI_MAX_INPUT_CHARS) {
      throw new AIError(
        "AI_INPUT_TOO_LARGE",
        `Input is ${total} characters; the configured limit is ${this.cfg.AI_MAX_INPUT_CHARS}.`,
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), this.cfg.AI_TIMEOUT_MS);
    req.signal?.addEventListener("abort", () => controller.abort("caller"), { once: true });

    const started = Date.now();
    let res: Response;
    try {
      res = await this.fetchImpl(this.url("/api/chat"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: req.messages,
          stream: false,
          ...(req.jsonSchema ? { format: req.jsonSchema } : {}),
          options: {
            temperature: req.temperature ?? this.cfg.AI_TEMPERATURE,
            num_predict: Math.min(req.maxOutputTokens ?? this.cfg.AI_MAX_OUTPUT_TOKENS, this.cfg.AI_MAX_OUTPUT_TOKENS),
            num_ctx: this.cfg.AI_CONTEXT_TOKENS,
          },
        }),
      });
    } catch {
      if (controller.signal.aborted && controller.signal.reason === "timeout") {
        throw new AIError("AI_TIMEOUT", `Model did not respond within ${this.cfg.AI_TIMEOUT_MS} ms.`, true);
      }
      if (controller.signal.aborted) throw new AIError("AI_UNAVAILABLE", "Request was cancelled.");
      throw new AIError("AI_UNAVAILABLE", "Cannot reach the inference server. Is Ollama running?", true);
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 404) {
      throw new AIError("AI_MODEL_MISSING", `Model "${this.model}" is not installed. Run: ollama pull ${this.model}`);
    }
    if (!res.ok) {
      throw new AIError("AI_BAD_RESPONSE", `Inference server returned HTTP ${res.status}.`, res.status >= 500);
    }

    let data: OllamaChatResponse;
    try {
      data = (await res.json()) as OllamaChatResponse;
    } catch {
      throw new AIError("AI_BAD_RESPONSE", "Inference server returned a non-JSON body.");
    }
    const text = data.message?.content;
    if (typeof text !== "string" || text.length === 0) {
      throw new AIError("AI_BAD_RESPONSE", "Inference server returned an empty completion.", true);
    }
    return {
      text,
      model: data.model ?? this.model,
      promptTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
      durationMs: Date.now() - started,
    };
  }

  async health(): Promise<AIHealth> {
    const base = { provider: this.name, model: this.model };
    try {
      const res = await this.fetchImpl(this.url("/api/tags"), { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return { ...base, ok: false, reachable: true, modelInstalled: false, detail: `HTTP ${res.status}` };
      const data = (await res.json()) as { models?: { name: string }[] };
      const names = (data.models ?? []).map((m) => m.name);
      const installed = names.some((n) => n === this.model || n === `${this.model}:latest`);
      return {
        ...base,
        ok: installed,
        reachable: true,
        modelInstalled: installed,
        detail: installed ? undefined : `Model not installed. Run: ollama pull ${this.model}`,
      };
    } catch {
      return { ...base, ok: false, reachable: false, modelInstalled: false, detail: "Inference server unreachable." };
    }
  }
}
