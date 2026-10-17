// Deterministic stand-ins used ONLY by the browser E2E suite:
//   * a tiny GitHub API + raw-content host
//   * an Ollama-compatible /api/chat + /api/tags
// The real Repo Tutor server talks to this through GITHUB_API_URL / GITHUB_RAW_URL / AI_BASE_URL,
// so the genuine ingestion, analysis, storage and verification code runs unchanged.
//
// Scriptable repositories:  acme/shop (normal) · acme/slow (+2.5s) · acme/missing (404)
//                           acme/limited (rate-limited) · acme/empty (no commits)
// Scriptable AI questions (keyword anywhere in the question):
//   FAILSERVER -> HTTP 500 · BADJSON -> malformed JSON · BADCITE -> answer with wrong citations
//   SLOWAI -> 1.5s delay · (otherwise) a correct, well-cited answer about listProducts
import http from "node:http";
import { fixtureIngestion } from "../tests/analysis/fixture";

const PORT = Number(process.env.FAKE_PORT ?? 4010);
const files: Record<string, string> = Object.fromEntries(fixtureIngestion.files.map((f) => [f.path, f.content]));
const SHA = "e2e0123456789abcdef0123456789abcdef01234";

const json = (res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function github(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const m = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!m) return json(res, 404, { message: "Not Found" });
  const [, owner, name, rest = ""] = m;
  if (owner !== "acme") return json(res, 404, { message: "Not Found" });
  if (name === "missing") return json(res, 404, { message: "Not Found" });
  if (name === "limited") {
    return json(res, 403, { message: "rate limit" }, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1800) });
  }
  if (name === "slow") await sleep(2500);
  if (rest === "") {
    return json(res, 200, {
      name, full_name: `acme/${name}`, owner: { login: "acme" }, description: "A tiny web shop API",
      stargazers_count: 12, language: "TypeScript", topics: ["shop"], default_branch: "main",
      html_url: `https://github.com/acme/${name}`, size: 40, archived: false,
    });
  }
  if (name === "empty") return json(res, 409, { message: "Git Repository is empty." });
  if (rest.startsWith("/commits/")) return json(res, 200, { sha: SHA, commit: { tree: { sha: "treesha" } } });
  if (rest.startsWith("/git/trees/")) {
    return json(res, 200, { sha: "treesha", truncated: false, tree: Object.entries(files).map(([path, c]) => ({ path, type: "blob", sha: "s", size: c.length })) });
  }
  return json(res, 404, { message: "Not Found" });
}

function raw(res: http.ServerResponse, url: URL) {
  const m = url.pathname.match(/^\/raw\/acme\/[^/]+\/[^/]+\/(.+)$/);
  const p = m ? decodeURIComponent(m[1]) : "";
  if (p in files) {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end(files[p]);
  }
  res.writeHead(404);
  res.end("not found");
}

async function chat(req: http.IncomingMessage, res: http.ServerResponse) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body || "{}");
  const user: string = (payload.messages ?? []).filter((m: { role: string }) => m.role === "user").pop()?.content ?? "";
  const q = user.split("Question:").pop() ?? "";
  const reply = (obj: unknown) => json(res, 200, { model: payload.model, message: { role: "assistant", content: typeof obj === "string" ? obj : JSON.stringify(obj) }, prompt_eval_count: 100, eval_count: 40 });

  if (q.includes("FAILSERVER")) return json(res, 500, { error: "model crashed" });
  if (q.includes("BADJSON")) return reply("sorry, here is some text that is not JSON {");
  if (q.includes("SLOWAI")) await sleep(1500);
  if (q.includes("BADCITE")) {
    return reply({
      answer: "`listProducts` is defined near the top of src/routes.ts and sends emails to customers.",
      citations: [{ path: "src/routes.ts", startLine: 1, endLine: 2, quote: "sendEmail(customer)" }],
      couldNotVerify: false,
    });
  }
  return reply({
    answer: "`listProducts` returns the list of products from src/db.ts.",
    citations: [{ path: "src/db.ts", startLine: 3, endLine: 5, quote: "export function listProducts() {" }],
    couldNotVerify: false,
  });
}

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (url.pathname === "/health") return json(res, 200, { ok: true });
      if (url.pathname === "/api/tags") return json(res, 200, { models: [{ name: "gemma3:1b" }] });
      if (url.pathname === "/api/chat" && req.method === "POST") return await chat(req, res);
      if (url.pathname.startsWith("/raw/")) return raw(res, url);
      return await github(req, res, url);
    } catch (e) {
      json(res, 500, { message: String(e) });
    }
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake services on ${PORT}`));
