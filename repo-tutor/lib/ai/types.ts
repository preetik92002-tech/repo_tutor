// Provider-agnostic AI contracts. Product code depends on these, never on a
// specific inference server, so the backend can be swapped via env config.

export type AIErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_UNAVAILABLE" // server unreachable / connection refused
  | "AI_MODEL_MISSING" // server reachable but model not pulled
  | "AI_TIMEOUT"
  | "AI_INPUT_TOO_LARGE"
  | "AI_BAD_RESPONSE" // non-2xx or malformed envelope
  | "AI_INVALID_OUTPUT"; // model text failed JSON/schema validation

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export interface AIChatMessage {
  role: "system" | "user";
  content: string;
}

export interface AICompletionRequest {
  messages: AIChatMessage[];
  /** JSON Schema the model output must conform to (constrained decoding where supported). */
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface AICompletionResult {
  text: string;
  model: string;
  promptTokens?: number;
  outputTokens?: number;
  durationMs: number;
}

export interface AIHealth {
  ok: boolean;
  provider: string;
  model: string;
  reachable: boolean;
  modelInstalled: boolean;
  detail?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(req: AICompletionRequest): Promise<AICompletionResult>;
  health(): Promise<AIHealth>;
}
