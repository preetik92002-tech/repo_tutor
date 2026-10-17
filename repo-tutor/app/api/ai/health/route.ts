import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

// Reports whether the configured inference server/model is usable.
// Exposes only provider and model names — no URLs, keys or env values.
export async function GET() {
  try {
    const h = await getAIProvider().health();
    return NextResponse.json(h, { status: h.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false, detail: "AI is not configured correctly." }, { status: 503 });
  }
}
