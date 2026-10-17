import { z } from "zod";
import { loadAIConfig } from "./config";
import { OllamaProvider } from "./ollama";
import { AIError, type AICompletionRequest, type AIProvider } from "./types";

export * from "./types";

let cached: AIProvider | undefined;

/** Returns the configured provider. Add new providers here; callers don't change. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const cfg = loadAIConfig();
  switch (cfg.AI_PROVIDER) {
    case "ollama":
      cached = new OllamaProvider(cfg);
      return cached;
  }
}

export interface StructuredOptions<T> {
  provider?: AIProvider;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
  /** Extra attempts when output fails validation (default 1 retry). */
  maxRetries?: number;
}

/**
 * Ask the model for JSON and validate it against a zod schema.
 * Output is never returned unvalidated; failures raise AIError, never mock data.
 */
export async function generateStructured<T>(
  opts: StructuredOptions<T>,
): Promise<{ data: T; model: string; durationMs: number; outputTokens?: number }> {
  const provider = opts.provider ?? getAIProvider();
  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  const attempts = 1 + (opts.maxRetries ?? 1);
  let lastIssue = "";
  for (let i = 0; i < attempts; i++) {
    const req: AICompletionRequest = {
      jsonSchema,
      maxOutputTokens: opts.maxOutputTokens,
      messages: [
        { role: "system", content: opts.system },
        {
          role: "user",
          content: i === 0 ? opts.user : `${opts.user}\n\nYour previous reply was invalid (${lastIssue}). Reply with valid JSON only.`,
        },
      ],
    };
    const result = await provider.complete(req);
    try {
      const data = opts.schema.parse(JSON.parse(result.text));
      return { data, model: result.model, durationMs: result.durationMs, outputTokens: result.outputTokens };
    } catch (err) {
      lastIssue =
        err instanceof z.ZodError
          ? err.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")
          : "not valid JSON";
    }
  }
  throw new AIError("AI_INVALID_OUTPUT", `Model output failed validation after ${attempts} attempt(s): ${lastIssue}`, true);
}
