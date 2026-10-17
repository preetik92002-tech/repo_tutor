import type { IngestionResult, IngestedFile } from "../github/client";
import { SOURCE_LANGS, importanceScore } from "../github/filters";
import { extractImports, extractSymbols, findLine, resolveLocalImport, type Symbol } from "./symbols";

// Deterministic repository analysis. Every claim carries evidence (file + line range) that
// was produced by inspecting the fetched text, never by a model.

export interface Evidence {
  path: string;
  startLine: number;
  endLine: number;
}

export interface Manifest {
  path: string;
  kind: "npm" | "python" | "go" | "rust" | "java" | "docker" | "other";
  name?: string;
  dependencies: { name: string; evidence?: Evidence }[];
  scripts: { name: string; command: string; evidence?: Evidence }[];
  main?: { value: string; evidence?: Evidence };
}

export interface Technology {
  name: string;
  evidence: Evidence;
  via: string; // e.g. dependency name
}

export interface EntryPoint {
  path: string;
  reason: string;
  evidence?: Evidence;
}

export interface FileInfo {
  path: string;
  language?: string;
  size: number;
  lineCount: number;
  symbols: Symbol[];
  imports: { spec: string; line: number; resolved?: string }[];
}

export interface RepoAnalysis {
  repo: { name: string; fullName: string; description: string; stars: number; language: string; htmlUrl: string; defaultBranch: string; topics: string[] };
  commitSha: string;
  languages: { name: string; files: number; bytes: number; percent: number }[];
  manifests: Manifest[];
  technologies: Technology[];
  entryPoints: EntryPoint[];
  directories: { path: string; fileCount: number; languages: string[] }[];
  files: FileInfo[];
  readingOrder: { path: string; reason: string }[];
  readme?: { path: string; excerpt: string; evidence: Evidence };
  stats: { analyzedFiles: number; repoFiles: number; skipped: Record<string, number> };
  /** Honest statements about what could not be determined. */
  limitations: string[];
}

// Technology detection is limited to this list; dependencies outside it are listed but not labelled.
const TECH: Record<string, string> = {
  react: "React", next: "Next.js", vue: "Vue", nuxt: "Nuxt", svelte: "Svelte", "@angular/core": "Angular", express: "Express",
  fastify: "Fastify", koa: "Koa", "@nestjs/core": "NestJS", typescript: "TypeScript", tailwindcss: "Tailwind CSS",
  prisma: "Prisma", "@prisma/client": "Prisma", mongoose: "Mongoose (MongoDB)", mongodb: "MongoDB", pg: "PostgreSQL client",
  mysql2: "MySQL client", redis: "Redis client", jest: "Jest", vitest: "Vitest", mocha: "Mocha", webpack: "webpack", vite: "Vite",
  eslint: "ESLint", graphql: "GraphQL", axios: "Axios", zod: "Zod", electron: "Electron", "react-native": "React Native",
  django: "Django", flask: "Flask", fastapi: "FastAPI", sqlalchemy: "SQLAlchemy", pytest: "pytest", numpy: "NumPy",
  pandas: "pandas", torch: "PyTorch", tensorflow: "TensorFlow", requests: "Requests", pydantic: "Pydantic", celery: "Celery",
  "github.com/gin-gonic/gin": "Gin", "github.com/gorilla/mux": "gorilla/mux", "github.com/labstack/echo": "Echo",
  tokio: "Tokio", serde: "Serde", actix_web: "Actix Web", "actix-web": "Actix Web", axum: "Axum", clap: "clap",
};

const readmeRe = /^readme(\.md|\.rst|\.txt)?$/i;

function lineOfKey(content: string, key: string): Evidence | undefined {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const n = findLine(content, new RegExp(`["']?${esc}["']?\\s*[:=]|^\\s*${esc}\\b|"${esc}"`));
  return n ? { path: "", startLine: n, endLine: n } : undefined;
}

function withPath(ev: Evidence | undefined, path: string): Evidence | undefined {
  return ev ? { ...ev, path } : undefined;
}

function parseManifest(f: IngestedFile): Manifest | null {
  const file = f.path.split("/").pop()!;
  if (file === "package.json") {
    let json: Record<string, unknown>;
    try { json = JSON.parse(f.content) as Record<string, unknown>; } catch { return { path: f.path, kind: "npm", dependencies: [], scripts: [] }; }
    const deps = { ...(json.dependencies as object | undefined), ...(json.devDependencies as object | undefined) };
    const scripts = (json.scripts && typeof json.scripts === "object" ? json.scripts : {}) as Record<string, string>;
    const main = typeof json.main === "string" ? json.main : undefined;
    return {
      path: f.path, kind: "npm", name: typeof json.name === "string" ? json.name : undefined,
      dependencies: Object.keys(deps).slice(0, 80).map((name) => ({ name, evidence: withPath(lineOfKey(f.content, name), f.path) })),
      scripts: Object.entries(scripts).slice(0, 20).filter(([, v]) => typeof v === "string").map(([name, command]) => ({ name, command, evidence: withPath(lineOfKey(f.content, name), f.path) })),
      main: main ? { value: main, evidence: withPath(lineOfKey(f.content, "main"), f.path) } : undefined,
    };
  }
  if (file === "requirements.txt") {
    const deps = f.content.split("\n").map((l, i) => ({ l: l.trim(), i })).filter(({ l }) => l && !l.startsWith("#") && !l.startsWith("-"))
      .slice(0, 80).map(({ l, i }) => ({ name: l.split(/[<>=!~\[; ]/)[0].toLowerCase(), evidence: { path: f.path, startLine: i + 1, endLine: i + 1 } }));
    return { path: f.path, kind: "python", dependencies: deps.filter((d) => d.name), scripts: [] };
  }
  if (file === "pyproject.toml") {
    const name = f.content.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1];
    const deps: Manifest["dependencies"] = [];
    const lines = f.content.split("\n");
    lines.forEach((l, i) => {
      const m = l.match(/^\s*["']([A-Za-z0-9_.-]+)(?:[<>=!~\[ ].*)?["'],?\s*$/);
      if (m && deps.length < 80) deps.push({ name: m[1].toLowerCase(), evidence: { path: f.path, startLine: i + 1, endLine: i + 1 } });
    });
    return { path: f.path, kind: "python", name, dependencies: deps, scripts: [] };
  }
  if (file === "go.mod") {
    const lines = f.content.split("\n");
    const name = f.content.match(/^module\s+(\S+)/m)?.[1];
    const deps: Manifest["dependencies"] = [];
    lines.forEach((l, i) => {
      const m = l.match(/^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/[\w./-]+)\s+v[\w.+-]+/);
      if (m && deps.length < 80) deps.push({ name: m[1], evidence: { path: f.path, startLine: i + 1, endLine: i + 1 } });
    });
    return { path: f.path, kind: "go", name, dependencies: deps, scripts: [] };
  }
  if (file === "Cargo.toml") {
    const lines = f.content.split("\n");
    const name = f.content.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
    const deps: Manifest["dependencies"] = [];
    let inDeps = false;
    lines.forEach((l, i) => {
      if (/^\[/.test(l)) inDeps = /^\[(dev-|build-)?dependencies\]/.test(l);
      else if (inDeps) {
        const m = l.match(/^([A-Za-z0-9_-]+)\s*=/);
        if (m && deps.length < 80) deps.push({ name: m[1], evidence: { path: f.path, startLine: i + 1, endLine: i + 1 } });
      }
    });
    return { path: f.path, kind: "rust", name, dependencies: deps, scripts: [] };
  }
  if (file === "pom.xml" || file === "build.gradle") return { path: f.path, kind: "java", dependencies: [], scripts: [] };
  if (file === "Dockerfile" || /^docker-compose\.ya?ml$/.test(file)) return { path: f.path, kind: "docker", dependencies: [], scripts: [] };
  return null;
}

export function analyzeRepository(ing: IngestionResult): RepoAnalysis {
  const { meta, files } = ing;
  const fileSet = new Set(files.map((f) => f.path));

  // Languages (by analyzed bytes, source languages only)
  const langAgg = new Map<string, { files: number; bytes: number }>();
  for (const f of files) {
    if (!f.language || !SOURCE_LANGS.has(f.language)) continue;
    const a = langAgg.get(f.language) ?? { files: 0, bytes: 0 };
    a.files++; a.bytes += f.size;
    langAgg.set(f.language, a);
  }
  const totalBytes = [...langAgg.values()].reduce((n, a) => n + a.bytes, 0) || 1;
  const languages = [...langAgg.entries()].map(([name, a]) => ({ name, ...a, percent: Math.round((a.bytes / totalBytes) * 100) })).sort((a, b) => b.bytes - a.bytes);

  // Manifests & technologies
  const manifests = files.map(parseManifest).filter((m): m is Manifest => !!m);
  const technologies: Technology[] = [];
  const seenTech = new Set<string>();
  for (const m of manifests) for (const d of m.dependencies) {
    const label = TECH[d.name];
    if (label && d.evidence && !seenTech.has(label)) {
      seenTech.add(label);
      technologies.push({ name: label, evidence: d.evidence, via: d.name });
    }
  }

  // File info (symbols / imports / relationships)
  const infos: FileInfo[] = files.map((f) => {
    const symbols = extractSymbols(f.content, f.language);
    const imports = extractImports(f.content, f.language).map((i) => ({ ...i, resolved: resolveLocalImport(f.path, i.spec, f.language, fileSet) ?? undefined }));
    return { path: f.path, language: f.language, size: f.size, lineCount: f.content.split("\n").length, symbols, imports };
  });

  // Entry points
  const entryPoints: EntryPoint[] = [];
  const addEntry = (e: EntryPoint) => { if (!entryPoints.some((x) => x.path === e.path)) entryPoints.push(e); };
  for (const m of manifests) {
    if (m.kind !== "npm") continue;
    const dir = m.path.includes("/") ? m.path.slice(0, m.path.lastIndexOf("/") + 1) : "";
    if (m.main) {
      const p = (dir + m.main.value.replace(/^\.\//, ""));
      if (fileSet.has(p)) addEntry({ path: p, reason: `"main" in ${m.path}`, evidence: m.main.evidence });
    }
    for (const s of m.scripts.filter((x) => ["start", "dev", "serve"].includes(x.name))) {
      const target = s.command.match(/(?:node|ts-node|tsx|nodemon)\s+([\w./-]+\.(?:js|ts|mjs|cjs))/)?.[1];
      if (target && fileSet.has(dir + target.replace(/^\.\//, ""))) addEntry({ path: dir + target.replace(/^\.\//, ""), reason: `"${s.name}" script runs it`, evidence: s.evidence });
    }
  }
  for (const f of files) {
    const base = f.path.split("/").pop()!;
    const c = f.content;
    let reason: string | undefined; let line: number | null = null;
    if (f.language === "Python" && (line = findLine(c, /^if\s+__name__\s*==\s*["']__main__["']/))) reason = 'contains `if __name__ == "__main__"`';
    else if (f.language === "Go" && (line = findLine(c, /^func\s+main\s*\(\s*\)/))) reason = "declares `func main()`";
    else if (f.language === "Rust" && (line = findLine(c, /^\s*fn\s+main\s*\(\s*\)/))) reason = "declares `fn main()`";
    else if (f.language === "Java" && (line = findLine(c, /public\s+static\s+void\s+main\s*\(/))) reason = "declares `public static void main`";
    else if (/^app\/page\.(tsx|jsx|js)$|^src\/app\/page\.(tsx|jsx|js)$/.test(f.path)) reason = "Next.js App Router home page";
    else if (/^(src\/)?pages\/index\.(tsx|jsx|js|ts)$/.test(f.path)) reason = "Next.js Pages Router home page";
    else if (/^(main|index|server|app|cli|__main__|manage)\.(ts|js|mjs|py|go|rs)$/.test(base) && f.path.split("/").length <= 2) reason = `conventional entry-point file name (${base})`;
    if (reason) addEntry({ path: f.path, reason, evidence: line ? { path: f.path, startLine: line, endLine: line } : undefined });
  }

  // Directories (top-level)
  const dirMap = new Map<string, { n: number; langs: Set<string> }>();
  for (const f of files) {
    const top = f.path.includes("/") ? f.path.split("/")[0] : "(root)";
    const d = dirMap.get(top) ?? { n: 0, langs: new Set() };
    d.n++; if (f.language && SOURCE_LANGS.has(f.language)) d.langs.add(f.language);
    dirMap.set(top, d);
  }
  const directories = [...dirMap.entries()].map(([path, d]) => ({ path, fileCount: d.n, languages: [...d.langs] })).sort((a, b) => b.fileCount - a.fileCount || a.path.localeCompare(b.path));

  // README
  let readme: RepoAnalysis["readme"];
  const rf = files.find((f) => readmeRe.test(f.path));
  if (rf) {
    const lines = rf.content.split("\n");
    let start = lines.findIndex((l) => l.trim() && !/^\s*[#!<[\-=*]/.test(l) && l.trim().length > 30);
    if (start < 0) start = 0;
    let end = start;
    let chars = 0;
    while (end < lines.length && chars < 500 && end - start < 8) chars += lines[end++].length + 1;
    readme = { path: rf.path, excerpt: lines.slice(start, end).join("\n").trim(), evidence: { path: rf.path, startLine: start + 1, endLine: Math.max(start + 1, end) } };
  }

  // Reading order: README → manifest → entry points → most-imported local files → rest by importance
  const order: { path: string; reason: string }[] = [];
  const addOrder = (path: string, reason: string) => { if (fileSet.has(path) && !order.some((o) => o.path === path)) order.push({ path, reason }); };
  if (rf) addOrder(rf.path, "Start here: what the project says it does");
  for (const m of manifests.filter((x) => x.kind !== "docker").slice(0, 2)) addOrder(m.path, "Dependencies, scripts and project metadata");
  for (const e of entryPoints.slice(0, 3)) addOrder(e.path, `Entry point — ${e.reason}`);
  const inbound = new Map<string, number>();
  for (const fi of infos) for (const im of fi.imports) if (im.resolved) inbound.set(im.resolved, (inbound.get(im.resolved) ?? 0) + 1);
  [...inbound.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([p, n]) => addOrder(p, `Imported by ${n} other analyzed file${n > 1 ? "s" : ""}`));
  [...infos].filter((f) => f.language && SOURCE_LANGS.has(f.language)).sort((a, b) => importanceScore(b.path) - importanceScore(a.path)).slice(0, 6).forEach((f) => addOrder(f.path, "High-priority source file by location and name"));

  // Limitations (what we could not know)
  const limitations = [...ing.notes];
  limitations.push("Analysis is based on pattern matching over the files that were read, not on running or fully parsing the code. Symbol lists and import links are approximate.");
  if (!entryPoints.length) limitations.push("No entry point could be identified from the files read; none is claimed.");
  if (!manifests.length) limitations.push("No dependency manifest (package.json, requirements.txt, go.mod, …) was found among the files read, so technologies could not be verified.");
  if (!rf) limitations.push("No README was found among the files read.");
  if (!languages.length) limitations.push("No recognised source-code language was found.");

  return {
    repo: { name: meta.name, fullName: meta.fullName, description: meta.description, stars: meta.stars, language: meta.language, htmlUrl: meta.htmlUrl, defaultBranch: meta.defaultBranch, topics: meta.topics },
    commitSha: ing.commitSha, languages, manifests, technologies, entryPoints, directories, files: infos, readingOrder: order, readme,
    stats: { analyzedFiles: files.length, repoFiles: ing.treePaths.length, skipped: ing.skipped as Record<string, number> },
    limitations,
  };
}

