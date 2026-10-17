import { describe, it, expect, vi } from "vitest";
import { GitHubError, parseRepoUrl, repoSlug } from "@/lib/github/url";
import { exclusionReason, redactSecrets, isSafePath, looksBinary, importanceScore } from "@/lib/github/filters";
import { GitHubClient, loadGitHubLimits } from "@/lib/github/client";

describe("parseRepoUrl", () => {
  it.each([
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["https://github.com/expressjs/express.git", "expressjs", "express"],
    ["https://www.github.com/facebook/react/", "facebook", "react"],
    ["https://github.com/facebook/react/tree/main/packages", "facebook", "react"],
    ["  facebook/react  ", "facebook", "react"],
  ])("accepts %s", (input, owner, name) => {
    expect(parseRepoUrl(input)).toEqual({ owner, name });
  });

  it.each([
    "", "   ", "not a url", "http://github.com/a/b", "https://gitlab.com/a/b", "https://github.com.evil.com/a/b",
    "https://evil.com/github.com/a/b", "https://user:pw@github.com/a/b", "https://github.com:8080/a/b",
    "https://github.com/onlyowner", "https://github.com/a/..", "https://github.com/-bad-/repo",
    "https://github.com/a/b c", "ftp://github.com/a/b", "https://github.com/a/" + "x".repeat(400),
    "https://127.0.0.1/a/b", "https://localhost/a/b", "javascript:alert(1)",
  ])("rejects %j", (input) => {
    expect(() => parseRepoUrl(input)).toThrow(GitHubError);
    try { parseRepoUrl(input); } catch (e) { expect((e as GitHubError).code).toBe("INVALID_URL"); }
  });

  it("slug is lowercase", () => expect(repoSlug({ owner: "Facebook", name: "React" })).toBe("facebook/react"));
});

describe("file filters", () => {
  const ex = (p: string, size = 100) => exclusionReason(p, size, 60_000);
  it("excludes dependency, build and VCS directories", () => {
    for (const p of ["node_modules/x/index.js", "src/node_modules/y.js", "dist/app.js", ".git/config", "vendor/a.go", ".next/x.js"]) {
      expect(ex(p)).toBe("excluded_dir");
    }
  });
  it("excludes binaries, lockfiles and minified bundles", () => {
    expect(ex("assets/logo.png")).toBe("binary");
    expect(ex("package-lock.json")).toBe("lockfile");
    expect(ex("public/app.min.js")).toBe("minified");
  });
  it("excludes likely secret files but allows templates", () => {
    for (const p of [".env", ".env.local", "config/.env.production", "certs/server.pem", "id_rsa", ".npmrc", "secrets.json", "prod.tfvars", "gcp-service-account.json"]) {
      expect(ex(p), p).toBe("secret_file");
    }
    expect(ex(".env.example")).toBeNull();
    expect(ex("src/environment.ts")).toBeNull();
  });
  it("excludes oversized and empty files", () => {
    expect(ex("src/big.ts", 1_000_000)).toBe("too_large");
    expect(ex("src/empty.ts", 0)).toBe("empty");
  });
  it("rejects traversal and malformed paths", () => {
    for (const p of ["../etc/passwd", "a/../../b", "/abs/path", "a\\b", "a//b", "a/./b", "a\0b", ""]) {
      expect(isSafePath(p), p).toBe(false);
      expect(ex(p)).toBe("unsafe_path");
    }
  });
  it("keeps ordinary source", () => expect(ex("src/index.ts")).toBeNull());
  it("ranks README/manifests/entry points above tests and assets", () => {
    expect(importanceScore("README.md")).toBeGreaterThan(importanceScore("src/util.ts"));
    expect(importanceScore("src/index.ts")).toBeGreaterThan(importanceScore("tests/util.test.ts"));
    expect(importanceScore("package.json")).toBeGreaterThan(importanceScore("docs/guide.md"));
  });
});

describe("redactSecrets / looksBinary", () => {
  it("redacts common token shapes and keyed assignments", () => {
    const src = [
      "const k = 'AKIAABCDEFGHIJKLMNOP';",
      "token = ghp_" + "a".repeat(36),
      "const apiKey = \"abcdef1234567890abcd\";",
      "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----",
      "const name = 'hello';",
    ].join("\n");
    const { text, redactions } = redactSecrets(src);
    expect(redactions).toBeGreaterThanOrEqual(4);
    expect(text).not.toContain("AKIAABCDEFGHIJKLMNOP");
    expect(text).not.toContain("ghp_");
    expect(text).not.toContain("abcdef1234567890abcd");
    expect(text).not.toContain("MIIE");
    expect(text).toContain("apiKey = \"[REDACTED]\"");
    expect(text).toContain("const name = 'hello';");
  });
  it("detects binary content", () => {
    expect(looksBinary("abc\0def")).toBe(true);
    expect(looksBinary("�".repeat(500))).toBe(true);
    expect(looksBinary("plain text")).toBe(false);
  });
});

// ─── Client with a fake GitHub ───────────────────────────────
const limits = loadGitHubLimits({ GH_MAX_FILES: "3", GH_MAX_TOTAL_BYTES: "100000", GH_CONCURRENCY: "2" });
const json = (b: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status, headers });

function fakeGitHub(opts: { files?: Record<string, string>; repo?: object; status?: number; headers?: Record<string, string> } = {}) {
  const files = opts.files ?? {
    "README.md": "# Demo\nA demo app",
    "package.json": '{"name":"demo","dependencies":{"express":"^4"}}',
    "src/index.ts": "console.log('hi')\n",
    "src/util.ts": "export const x = 1\n",
    "node_modules/dep/index.js": "x",
    "logo.png": "binary",
    ".env": "SECRET=1",
  };
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (opts.status) return json({ message: "boom" }, opts.status, opts.headers);
    if (url.endsWith("/repos/o/r")) {
      return json({ name: "r", full_name: "o/r", owner: { login: "o" }, description: "d", stargazers_count: 5, language: "TypeScript", topics: ["t"], default_branch: "main", html_url: "https://github.com/o/r", size: 10, archived: false, ...opts.repo });
    }
    if (url.includes("/commits/main")) return json({ sha: "c0ffee", commit: { tree: { sha: "treesha" } } });
    if (url.includes("/git/trees/")) {
      return json({ sha: "treesha", truncated: false, tree: Object.entries(files).map(([path, c]) => ({ path, type: "blob", sha: "s" + path, size: c.length })) });
    }
    if (url.startsWith("https://raw.githubusercontent.com/o/r/c0ffee/")) {
      const p = decodeURIComponent(url.replace("https://raw.githubusercontent.com/o/r/c0ffee/", ""));
      return p in files ? new Response(files[p]) : new Response("", { status: 404 });
    }
    return json({}, 404);
  });
}

describe("GitHubClient.ingest", () => {
  it("fetches metadata, pins to the commit SHA, filters files and respects the file budget", async () => {
    const f = fakeGitHub();
    const r = await new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" });
    expect(r.commitSha).toBe("c0ffee");
    expect(r.meta.fullName).toBe("o/r");
    const paths = r.files.map((x) => x.path);
    expect(paths).toEqual(expect.arrayContaining(["README.md", "package.json"]));
    expect(paths.length).toBeLessThanOrEqual(3);
    expect(paths).not.toContain(".env");
    expect(paths).not.toContain("logo.png");
    expect(paths.some((p) => p.startsWith("node_modules"))).toBe(false);
    expect(r.skipped.secret_file).toBe(1);
    expect(r.skipped.excluded_dir).toBe(1);
    expect(r.notes.join(" ")).toMatch(/most important files/);
    // secret file content must never be requested
    expect(f.mock.calls.some(([u]) => String(u).includes(".env"))).toBe(false);
  });

  it("only talks to the two fixed GitHub hosts", async () => {
    const f = fakeGitHub();
    await new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" });
    for (const [u] of f.mock.calls) expect(["api.github.com", "raw.githubusercontent.com"]).toContain(new URL(String(u)).hostname);
  });

  it("only sends the token to api.github.com", async () => {
    const f = fakeGitHub();
    const l = loadGitHubLimits({ GITHUB_TOKEN: "tok", GH_MAX_FILES: "2" });
    await new GitHubClient(l, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" });
    for (const [u, init] of f.mock.calls as unknown as [string, RequestInit][]) {
      const auth = (init.headers as Record<string, string>).authorization;
      expect(Boolean(auth)).toBe(new URL(String(u)).hostname === "api.github.com");
    }
  });

  it("maps 404 to NOT_FOUND", async () => {
    await expect(new GitHubClient(limits, fakeGitHub({ status: 404 }) as unknown as typeof fetch).ingest({ owner: "o", name: "r" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("maps exhausted rate limit to RATE_LIMITED with a wait time", async () => {
    const reset = String(Math.floor(Date.now() / 1000) + 600);
    const f = fakeGitHub({ status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset } });
    const e = await new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" }).catch((x) => x);
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.retryAfterSec).toBeGreaterThan(0);
    expect(e.message).toMatch(/minute/);
  });

  it("maps network failure and timeout", async () => {
    const down = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(new GitHubClient(limits, down as unknown as typeof fetch).ingest({ owner: "o", name: "r" })).rejects.toMatchObject({ code: "NETWORK" });
    const slow = vi.fn().mockRejectedValue(new DOMException("t", "TimeoutError"));
    await expect(new GitHubClient(limits, slow as unknown as typeof fetch).ingest({ owner: "o", name: "r" })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects repositories with nothing analyzable", async () => {
    const f = fakeGitHub({ files: { "logo.png": "x", "node_modules/a.js": "x", ".env": "A=1" } });
    await expect(new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" }))
      .rejects.toMatchObject({ code: "NO_ANALYZABLE_FILES" });
  });

  it("reports an empty repository", async () => {
    const f = vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.endsWith("/repos/o/r")) return json({ name: "r", full_name: "o/r", owner: { login: "o" }, default_branch: "main", html_url: "x" });
      return json({ message: "Git Repository is empty." }, 409);
    });
    await expect(new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" }))
      .rejects.toMatchObject({ code: "EMPTY_REPO" });
  });

  it("rejects private repositories", async () => {
    const f = fakeGitHub({ repo: { private: true } });
    await expect(new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("notes truncation for very large repositories and never fetches beyond the budget", async () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < 500; i++) many[`src/file${i}.ts`] = "export const a = 1;\n";
    const f = fakeGitHub({ files: many });
    const r = await new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" });
    expect(r.files.length).toBe(3);
    expect(r.skipped.budget).toBe(497);
    const rawCalls = f.mock.calls.filter(([u]) => String(u).startsWith("https://raw"));
    expect(rawCalls.length).toBe(3);
  });

  it("aborts (does not return a partial repo) when GitHub rate-limits mid-fetch", async () => {
    const base = fakeGitHub();
    const f = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith("https://raw")) return json({}, 429, { "retry-after": "60" });
      return (base as unknown as (i: RequestInfo | URL) => Promise<Response>)(input);
    });
    await expect(new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" }))
      .rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("redacts secrets found inside allowed files", async () => {
    const f = fakeGitHub({ files: { "src/a.ts": "const apiKey = 'abcdef1234567890abcd';\n" } });
    const r = await new GitHubClient(limits, f as unknown as typeof fetch).ingest({ owner: "o", name: "r" });
    expect(r.files[0].content).not.toContain("abcdef1234567890abcd");
    expect(r.files[0].redactions).toBe(1);
    expect(r.notes.join(" ")).toMatch(/redacted/);
  });
});
