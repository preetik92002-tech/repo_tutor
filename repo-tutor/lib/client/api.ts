// Browser-side helper for calling our own API. Surfaces the server's user-safe error message.

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly retryable = false) {
    super(message);
  }
}

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiRequestError(0, "NETWORK", "Could not reach the server. Check your connection and try again.", true);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; retryable?: boolean } } | null)?.error;
    throw new ApiRequestError(res.status, e?.code ?? "ERROR", e?.message ?? `Request failed (HTTP ${res.status}).`, !!e?.retryable || res.status >= 500);
  }
  return data as T;
}
