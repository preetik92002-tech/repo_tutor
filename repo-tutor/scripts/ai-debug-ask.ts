// Debug helper: run the tutor's exact prompt against the configured model and print the RAW output.
// Usage: npx tsx --env-file-if-exists=.env.local scripts/ai-debug-ask.ts <sqlite-path> <owner/name> "<question>"
import { DatabaseSync } from "node:sqlite";
import { getAIProvider } from "../lib/ai";
import { z } from "zod";
import { citationSchema } from "../lib/grounding/citations";
import { selectContext } from "../lib/tutor/ask";

async function main() {
  const [dbPath, slug, question] = process.argv.slice(2);
  const db = new DatabaseSync(dbPath);
  const a = db.prepare("SELECT id FROM analyses WHERE repo_slug = ? AND status = 'completed' ORDER BY id DESC LIMIT 1").get(slug) as { id: number };
  const files = db.prepare("SELECT path, content FROM analysis_files WHERE analysis_id = ?").all(a.id) as { path: string; content: string }[];
  const ctx = selectContext(files, question, 9000);
  console.log("context files:", ctx.map((c) => `${c.path} (${c.text.length} chars)`).join(", "));
  const user = `${ctx.map((c) => `<file path="${c.path}">\n${c.text}</file>`).join("\n")}\n\nQuestion: ${question}`;
  const t = Date.now();
  const r = await getAIProvider().complete({
    messages: [
      { role: "system", content: "You are Repo Tutor. Answer ONLY from the numbered source lines. Reply with JSON only." },
      { role: "user", content: user },
    ],
    maxOutputTokens: 500,
    ...(process.env.WITH_SCHEMA ? { jsonSchema: z.toJSONSchema(z.object({ answer: z.string().min(10).max(1500), citations: z.array(citationSchema).max(4), couldNotVerify: z.boolean() })) as Record<string, unknown> } : {}),
  });
  console.log("ms:", Date.now() - t, "tokens:", r.outputTokens, "promptTokens:", r.promptTokens);
  console.log("LEN:", r.text.length, "TAIL:", r.text.slice(-250)); try { const j = JSON.parse(r.text); console.log("PARSED keys:", Object.keys(j), "citations:", JSON.stringify(j.citations)); } catch (e) { console.log("JSON.parse FAILED:", (e as Error).message); }
}
main().catch((e) => {
  console.error('FAILED:', e.code ?? '', e.message);
  process.exit(1);
});
