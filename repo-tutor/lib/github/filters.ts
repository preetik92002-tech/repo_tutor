// Decides which repository files may be fetched and shown to a model.
// Repository content is untrusted: we never execute it, and we keep secrets,
// binaries, dependency trees and generated output out of the pipeline.

const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next", ".nuxt", ".output", ".svelte-kit",
  "vendor", "third_party", "target", "bin", "obj", "__pycache__", ".venv", "venv", "env", ".tox", ".mypy_cache",
  ".pytest_cache", "coverage", ".nyc_output", ".idea", ".gradle", "Pods", ".terraform", ".cache", ".parcel-cache",
  "bower_components", ".yarn", ".pnpm-store", "site-packages",
]);

const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "svgz", "psd", "mp3", "mp4", "mov", "avi", "wav", "ogg",
  "webm", "flac", "zip", "tar", "gz", "tgz", "bz2", "xz", "7z", "rar", "jar", "war", "class", "exe", "dll", "so",
  "dylib", "o", "a", "bin", "wasm", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "woff", "woff2", "ttf", "otf",
  "eot", "pyc", "pyo", "db", "sqlite", "sqlite3", "lock", "map", "min.js",
]);

const LOCKFILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "composer.lock", "Gemfile.lock", "poetry.lock",
  "Cargo.lock", "go.sum", "Pipfile.lock", "mix.lock", "pubspec.lock",
]);

// Files that commonly hold credentials. `.env.example`-style templates are allowed.
const SECRET_NAME_RES = [
  /^\.env(\..+)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore|ppk|kdbx|cer|crt|der)$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /^\.?(npmrc|pypirc|netrc|htpasswd|git-credentials|dockercfg)$/i,
  /(^|[._-])(secrets?|credentials?)([._-]|$)/i,
  /service[-_]?account.*\.json$/i,
  /^terraform\.tfstate/i,
  /\.tfvars$/i,
];
const SECRET_ALLOWED = /\.(example|sample|template|dist)$/i;

export type ExclusionReason = "unsafe_path" | "excluded_dir" | "binary" | "lockfile" | "minified" | "secret_file" | "too_large" | "empty";

/** Rejects traversal and odd paths coming back from the API before we ever build a URL from them. */
export function isSafePath(p: string): boolean {
  if (!p || p.length > 400) return false;
  if (p.startsWith("/") || p.includes("\\") || p.includes("\0")) return false;
  return !p.split("/").some((seg) => seg === ".." || seg === "." || seg === "");
}

export function exclusionReason(path: string, size: number, maxFileBytes: number): ExclusionReason | null {
  if (!isSafePath(path)) return "unsafe_path";
  const segs = path.split("/");
  const file = segs[segs.length - 1];
  if (segs.slice(0, -1).some((s) => EXCLUDED_DIRS.has(s))) return "excluded_dir";
  if (LOCKFILES.has(file)) return "lockfile";
  if (/\.min\.(js|css)$/i.test(file) || /-min\.(js|css)$/i.test(file)) return "minified";
  const lower = file.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  if (ext && BINARY_EXT.has(ext)) return "binary";
  if (!SECRET_ALLOWED.test(file) && SECRET_NAME_RES.some((re) => re.test(file))) return "secret_file";
  if (size === 0) return "empty";
  if (size > maxFileBytes) return "too_large";
  return null;
}

// ─── Content-level secret redaction ──────────────────────────
// Defence in depth: even allowed files can embed tokens. Redacted before storage,
// display, and prompting.
const SECRET_CONTENT_RES: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAIza[0-9A-Za-z_-]{35}/g,
  /\brzp_(?:live|test)_[A-Za-z0-9]{10,}/g,
];
// key = "value" style assignments; the key name is kept so the line stays readable
const KEYED_SECRET_RE = /((?:api[_-]?key|secret|token|passwd|password|private[_-]?key)["']?\s*[:=]\s*["'])([^"'\s]{12,})(["'])/gi;

export function redactSecrets(text: string): { text: string; redactions: number } {
  let count = 0;
  let out = text;
  for (const re of SECRET_CONTENT_RES) {
    out = out.replace(re, () => (count++, "[REDACTED]"));
  }
  out = out.replace(KEYED_SECRET_RE, (_m, pre: string, _v: string, post: string) => (count++, `${pre}[REDACTED]${post}`));
  return { text: out, redactions: count };
}

/** Heuristic: NUL bytes or many replacement characters mean this is not text. */
export function looksBinary(text: string): boolean {
  if (text.includes("\0")) return true;
  const sample = text.slice(0, 4000);
  const bad = (sample.match(/�/g) ?? []).length;
  return sample.length > 0 && bad / sample.length > 0.02;
}

// ─── Importance ranking ──────────────────────────────────────
const LANG_BY_EXT: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", rb: "Ruby", php: "PHP", cs: "C#", c: "C", h: "C",
  cpp: "C++", cc: "C++", hpp: "C++", swift: "Swift", scala: "Scala", dart: "Dart", lua: "Lua", sh: "Shell",
  vue: "Vue", svelte: "Svelte", html: "HTML", css: "CSS", scss: "SCSS", json: "JSON", yml: "YAML", yaml: "YAML",
  toml: "TOML", md: "Markdown", sql: "SQL",
};
export const SOURCE_LANGS = new Set([
  "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Kotlin", "Ruby", "PHP", "C#", "C", "C++", "Swift",
  "Scala", "Dart", "Lua", "Shell", "Vue", "Svelte",
]);

export function languageOf(path: string): string | undefined {
  const file = path.split("/").pop() ?? path;
  if (file === "Dockerfile") return "Dockerfile";
  const ext = file.includes(".") ? file.slice(file.lastIndexOf(".") + 1).toLowerCase() : "";
  return LANG_BY_EXT[ext];
}

const MANIFESTS = new Set([
  "package.json", "pyproject.toml", "requirements.txt", "setup.py", "go.mod", "Cargo.toml", "pom.xml",
  "build.gradle", "Gemfile", "composer.json", "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  "tsconfig.json", "Makefile",
]);
const ENTRY_RE = /(^|\/)(index|main|app|server|cli|__main__|manage|program)\.(ts|tsx|js|jsx|mjs|py|go|rs|java|rb|php|cs)$/i;
const TEST_RE = /(^|\/)(tests?|__tests__|spec|e2e|fixtures|__mocks__|examples?|docs?|benchmarks?)\//i;

export function importanceScore(path: string): number {
  const segs = path.split("/");
  const file = segs[segs.length - 1];
  const depth = segs.length - 1;
  let s = 0;
  if (/^readme(\.md|\.rst|\.txt)?$/i.test(file) && depth === 0) s += 100;
  if (MANIFESTS.has(file)) s += depth === 0 ? 90 : 40;
  if (/^(contributing|architecture)\.md$/i.test(file) && depth === 0) s += 30;
  if (ENTRY_RE.test(path)) s += 60 - Math.min(depth, 5) * 6;
  const lang = languageOf(path);
  if (lang && SOURCE_LANGS.has(lang)) s += 25 - Math.min(depth, 6) * 2;
  if (/(^|\/)(src|lib|app|pkg|cmd|internal|core|server|api)\//.test(path)) s += 12;
  if (TEST_RE.test(path)) s -= 25;
  if (!lang && !MANIFESTS.has(file)) s -= 30;
  return s;
}
