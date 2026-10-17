import { z } from "zod";
import { GitHubError, type RepoRef } from "./url";
import { exclusionReason, importanceScore, languageOf, looksBinary, redactSecrets, type ExclusionReason } from "./filters";

// ─── Limits (all env-configurable, server-side) ──────────────
const limitsSchema = z.object({
  GITHUB_TOKEN: z.string().optional(), // optional; raises the API rate limit. Server-only.
  // Server-side only. Defaults are GitHub itself; override for tests or a mirror. Never user input.
  GITHUB_API_URL: z.string().url().default("https://api.github.com"),
  GITHUB_RAW_URL: z.string().url().default("https://raw.githubusercontent.com"),
  GH_MAX_FILES: z.coerce.number().int().min(1).max(200).default(40),
  GH_MAX_FILE_BYTES: z.coerce.number().int().min(1000).max(500_000).default(60_000),
  GH_MAX_TOTAL_BYTES: z.coerce.number().int().min(10_000).max(5_000_000).default(600_000),
  GH_MAX_TREE_ENTRIES: z.coerce.number().int().min(100).max(100_000).default(20_000),
  GH_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(15_000),
  GH_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(4),
});
export type GitHubLimits = z.infer<typeof limitsSchema>;
export const loadGitHubLimits = (env: Record<string, string | undefined> = process.env): GitHubLimits =>
  limitsSchema.parse(env);

// ─── Types ───────────────────────────────────────────────────
export interface RepoMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  defaultBranch: string;
  htmlUrl: string;
  sizeKb: number;
  archived: boolean;
}
export interface TreeEntry {
  path: string;
  size: number;
  sha: string;
}
export interface RepoTree {
  commitSha: string;
  entries: TreeEntry[];
  truncated: boolean;
}
export interface IngestedFile {
  path: string;
  size: number;
  language?: string;
  content: string;
  redactions: number;
}
export interface IngestionResult {
  meta: RepoMeta;
  commitSha: string;
  treePaths: string[];
  files: IngestedFile[];
  skipped: Partial<Record<ExclusionReason | "budget" | "not_text" | "fetch_failed", number>>;
  notes: string[]; // user-visible limitations (truncation, budgets...)
}

const repoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  owner: z.object({ login: z.string() }),
  description: z.string().nullable().optional(),
  stargazers_count: z.number().default(0),
  language: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  default_branch: z.string(),
  html_url: z.string(),
  size: z.number().default(0),
  archived: z.boolean().default(false),
  private: z.boolean().optional(),
});
const commitSchema = z.object({ sha: z.string(), commit: z.object({ tree: z.object({ sha: z.string() }) }) });
const treeSchema = z.object({
  sha: z.string(),
  truncated: z.boolean().default(false),
  tree: z.array(z.object({ path: z.string(), type: z.string(), sha: z.string(), size: z.number().optional() })),
});

type Fetch = typeof fetch;

export class GitHubClient {
  constructor(
    private readonly limits: GitHubLimits = loadGitHubLimits(),
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  private get api() {
    return this.limits.GITHUB_API_URL.replace(/\/+$/, "");
  }
  private get raw() {
    return this.limits.GITHUB_RAW_URL.replace(/\/+$/, "");
  }

  private async request(url: string, accept = "application/vnd.github+json"): Promise<Response> {
    const headers: Record<string, string> = { accept, "user-agent": "repo-tutor", "x-github-api-version": "2022-11-28" };
    // The token is only ever sent to api.github.com, never to raw content hosts.
    if (this.limits.GITHUB_TOKEN && new URL(url).origin === new URL(this.limits.GITHUB_API_URL).origin) {
      headers.authorization = `Bearer ${this.limits.GITHUB_TOKEN}`;
    }
    let res: Response;
    try {
      res = await this.fetchImpl(url, { headers, signal: AbortSignal.timeout(this.limits.GH_TIMEOUT_MS), redirect: "error" });
    } catch (e) {
      if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new GitHubError("TIMEOUT", "GitHub took too long to respond. Please try again.");
      }
      throw new GitHubError("NETWORK", "Could not reach GitHub. Check your connection and try again.");
    }
    if (res.status === 404) throw new GitHubError("NOT_FOUND", "Repository not found. It may not exist or may be private (only public repositories are supported).");
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      const retry = Number(res.headers.get("retry-after"));
      if (remaining === "0" || res.status === 429 || retry) {
        const wait = retry || (reset ? Math.max(0, reset - Math.floor(Date.now() / 1000)) : undefined);
        throw new GitHubError(
          "RATE_LIMITED",
          `GitHub's rate limit was reached${wait ? `; try again in about ${Math.ceil(wait / 60)} minute(s)` : ""}. Setting GITHUB_TOKEN on the server raises the limit.`,
          wait,
        );
      }
      throw new GitHubError("NOT_FOUND", "Access to this repository is denied. Only public repositories are supported.");
    }
    if (!res.ok) throw new GitHubError("UPSTREAM", `GitHub returned an unexpected response (HTTP ${res.status}).`);
    return res;
  }

  private async json<T>(url: string, schema: z.ZodType<T>): Promise<T> {
    const res = await this.request(url);
    try {
      return schema.parse(await res.json());
    } catch {
      throw new GitHubError("UPSTREAM", "GitHub returned data in an unexpected format.");
    }
  }

  async getMeta(ref: RepoRef): Promise<RepoMeta> {
    const r = await this.json(`${this.api}/repos/${ref.owner}/${ref.name}`, repoSchema);
    if (r.private) throw new GitHubError("NOT_FOUND", "Only public repositories are supported.");
    return {
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? "",
      stars: r.stargazers_count,
      language: r.language ?? "Unknown",
      topics: r.topics ?? [],
      defaultBranch: r.default_branch,
      htmlUrl: r.html_url,
      sizeKb: r.size,
      archived: r.archived,
    };
  }

  async getTree(ref: RepoRef, branch: string): Promise<RepoTree> {
    let commit;
    try {
      commit = await this.json(
        `${this.api}/repos/${ref.owner}/${ref.name}/commits/${encodeURIComponent(branch)}`,
        commitSchema,
      );
    } catch (e) {
      // GitHub answers 404/409 for a repository with no commits
      if (e instanceof GitHubError && (e.code === "NOT_FOUND" || e.code === "UPSTREAM")) {
        throw new GitHubError("EMPTY_REPO", "This repository has no commits to learn from yet.");
      }
      throw e;
    }
    const t = await this.json(
      `${this.api}/repos/${ref.owner}/${ref.name}/git/trees/${commit.commit.tree.sha}?recursive=1`,
      treeSchema,
    );
    const entries = t.tree
      .filter((n) => n.type === "blob")
      .slice(0, this.limits.GH_MAX_TREE_ENTRIES)
      .map((n) => ({ path: n.path, size: n.size ?? 0, sha: n.sha }));
    if (entries.length === 0) throw new GitHubError("EMPTY_REPO", "This repository has no files.");
    return { commitSha: commit.sha, entries, truncated: t.truncated || t.tree.length > this.limits.GH_MAX_TREE_ENTRIES };
  }

  /** Raw file content pinned to a commit SHA. Streams with a hard byte cap (decompression-bomb safe). */
  private async getRaw(ref: RepoRef, sha: string, path: string): Promise<string> {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const res = await this.request(`${this.raw}/${ref.owner}/${ref.name}/${sha}/${encoded}`, "text/plain");
    const cap = this.limits.GH_MAX_FILE_BYTES + 1024;
    const reader = res.body?.getReader();
    if (!reader) return (await res.text()).slice(0, cap);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > cap) {
        await reader.cancel();
        throw new GitHubError("TOO_LARGE", `${path} exceeded the file size limit.`);
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
  }

  async ingest(ref: RepoRef): Promise<IngestionResult> {
    const L = this.limits;
    const meta = await this.getMeta(ref);
    const tree = await this.getTree(ref, meta.defaultBranch);
    const notes: string[] = [];
    const skipped: IngestionResult["skipped"] = {};
    const bump = (k: keyof IngestionResult["skipped"]) => (skipped[k] = (skipped[k] ?? 0) + 1);

    if (tree.truncated) notes.push(`The repository is very large; only the first ${tree.entries.length} files GitHub listed were considered.`);
    if (meta.archived) notes.push("This repository is archived (read-only).");

    const candidates: TreeEntry[] = [];
    for (const e of tree.entries) {
      const why = exclusionReason(e.path, e.size, L.GH_MAX_FILE_BYTES);
      if (why) bump(why);
      else candidates.push(e);
    }
    if (candidates.length === 0) {
      throw new GitHubError("NO_ANALYZABLE_FILES", "No readable source files were found (everything was binary, generated, a dependency, or too large).");
    }

    candidates.sort((a, b) => importanceScore(b.path) - importanceScore(a.path) || a.path.localeCompare(b.path));
    const picked: TreeEntry[] = [];
    let budget = L.GH_MAX_TOTAL_BYTES;
    for (const c of candidates) {
      if (picked.length >= L.GH_MAX_FILES || c.size > budget) {
        bump("budget");
        continue;
      }
      picked.push(c);
      budget -= c.size;
    }
    if ((skipped.budget ?? 0) > 0) {
      notes.push(`Analysis is limited to the ${picked.length} most important files (max ${L.GH_MAX_FILES} files / ${Math.round(L.GH_MAX_TOTAL_BYTES / 1000)} KB). Other files were not read.`);
    }

    const files: IngestedFile[] = [];
    let i = 0;
    const worker = async () => {
      while (i < picked.length) {
        const f = picked[i++];
        try {
          const raw = await this.getRaw(ref, tree.commitSha, f.path);
          if (looksBinary(raw)) {
            bump("not_text");
            continue;
          }
          const { text, redactions } = redactSecrets(raw);
          files.push({ path: f.path, size: f.size, language: languageOf(f.path), content: text, redactions });
        } catch (e) {
          // Rate limiting / network problems abort the whole run so we never present a half-fetched repo as complete.
          if (e instanceof GitHubError && (e.code === "RATE_LIMITED" || e.code === "NETWORK" || e.code === "TIMEOUT")) throw e;
          bump("fetch_failed");
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(L.GH_CONCURRENCY, picked.length) }, worker));

    if (files.length === 0) throw new GitHubError("NO_ANALYZABLE_FILES", "None of the selected files could be read.");
    if ((skipped.fetch_failed ?? 0) > 0) notes.push(`${skipped.fetch_failed} file(s) could not be fetched and were skipped.`);
    const redacted = files.reduce((n, f) => n + f.redactions, 0);
    if (redacted > 0) notes.push(`${redacted} possible secret value(s) were redacted from the source shown.`);

    files.sort((a, b) => a.path.localeCompare(b.path));
    return { meta, commitSha: tree.commitSha, treePaths: tree.entries.map((e) => e.path).filter((p) => !exclusionReason(p, 1, Infinity)), files, skipped, notes };
  }
}
