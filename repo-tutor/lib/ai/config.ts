import { z } from "zod";

// Server-only. Never import from client components.
const schema = z.object({
  AI_PROVIDER: z.enum(["ollama"]).default("ollama"),
  AI_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  AI_MODEL: z.string().min(1).default("gemma3:1b"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  AI_MAX_INPUT_CHARS: z.coerce.number().int().min(500).max(200_000).default(12_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(16).max(8192).default(1024),
  AI_CONTEXT_TOKENS: z.coerce.number().int().min(512).max(131_072).default(4096),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
});

export type AIConfig = z.infer<typeof schema>;

export function loadAIConfig(env: Record<string, string | undefined> = process.env): AIConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid AI configuration: ${issues}`);
  }
  return parsed.data;
}
