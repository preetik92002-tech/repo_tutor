// Deterministic source inspection: declarations and imports found with plain
// regexes. Nothing here is executed or evaluated; repository text is only read.
// Results are approximate (no full parser) and are described that way in the UI.

import { splitLines } from "../grounding/citations";

export interface Symbol {
  name: string;
  kind: "function" | "class" | "const" | "type" | "struct" | "interface" | "enum";
  line: number; // 1-based
  exported: boolean;
}

const MAX_SYMBOLS = 40;

type Rule = { re: RegExp; kind: Symbol["kind"]; exported?: (m: RegExpMatchArray) => boolean };

const JS_RULES: Rule[] = [
  { re: /^(export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/, kind: "function", exported: (m) => !!m[1] },
  { re: /^(export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: "class", exported: (m) => !!m[1] },
  { re: /^(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=>/, kind: "function", exported: (m) => !!m[1] },
  { re: /^(export\s+)?(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*(?::[^=]+)?=/, kind: "const", exported: (m) => !!m[1] },
  { re: /^(export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: "interface", exported: (m) => !!m[1] },
  { re: /^(export\s+)?type\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*=/, kind: "type", exported: (m) => !!m[1] },
  { re: /^(export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/, kind: "enum", exported: (m) => !!m[1] },
];
const PY_RULES: Rule[] = [
  { re: /^(?:async\s+)?def\s+([A-Za-z_]\w*)/, kind: "function" },
  { re: /^class\s+([A-Za-z_]\w*)/, kind: "class" },
];
const GO_RULES: Rule[] = [
  { re: /^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/, kind: "function" },
  { re: /^type\s+([A-Za-z_]\w*)\s+struct/, kind: "struct" },
  { re: /^type\s+([A-Za-z_]\w*)\s+interface/, kind: "interface" },
];
const RUST_RULES: Rule[] = [
  { re: /^(pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/, kind: "function", exported: (m) => !!m[1] },
  { re: /^(pub(?:\([^)]*\))?\s+)?struct\s+([A-Za-z_]\w*)/, kind: "struct", exported: (m) => !!m[1] },
  { re: /^(pub(?:\([^)]*\))?\s+)?enum\s+([A-Za-z_]\w*)/, kind: "enum", exported: (m) => !!m[1] },
];
const JAVA_RULES: Rule[] = [
  { re: /^(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+|static\s+)*(?:class|record)\s+([A-Za-z_]\w*)/, kind: "class" },
  { re: /^(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+|static\s+)*interface\s+([A-Za-z_]\w*)/, kind: "interface" },
];

function rulesFor(language: string | undefined): Rule[] {
  switch (language) {
    case "TypeScript": case "JavaScript": case "Vue": case "Svelte": return JS_RULES;
    case "Python": return PY_RULES;
    case "Go": return GO_RULES;
    case "Rust": return RUST_RULES;
    case "Java": case "Kotlin": case "C#": return JAVA_RULES;
    default: return [];
  }
}

/** Top-level-ish declarations (lines starting at column 0, or one indent for Python/Go methods excluded). */
export function extractSymbols(content: string, language: string | undefined): Symbol[] {
  const rules = rulesFor(language);
  if (!rules.length) return [];
  const out: Symbol[] = [];
  const lines = splitLines(content);
  for (let i = 0; i < lines.length && out.length < MAX_SYMBOLS; i++) {
    const line = lines[i];
    if (!line || /^\s/.test(line) || line.length > 300) continue; // column-0 declarations only
    for (const r of rules) {
      const m = line.match(r.re);
      if (!m) continue;
      const name = m[m.length - 1];
      if (!name) continue;
      const exported = r.exported ? r.exported(m) : language === "Python" ? !name.startsWith("_") : /^[A-Z]/.test(name) && language === "Go";
      out.push({ name, kind: r.kind, line: i + 1, exported });
      break;
    }
  }
  return out;
}

export interface ImportRef {
  spec: string;
  line: number;
}

export function extractImports(content: string, language: string | undefined): ImportRef[] {
  const out: ImportRef[] = [];
  const lines = splitLines(content);
  for (let i = 0; i < lines.length && out.length < 80; i++) {
    const l = lines[i];
    if (language === "TypeScript" || language === "JavaScript" || language === "Vue" || language === "Svelte") {
      const m = l.match(/^\s*(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+[^'"]*?\s+from\s+)['"]([^'"]+)['"]/) ?? l.match(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/);
      if (m) out.push({ spec: m[1], line: i + 1 });
    } else if (language === "Python") {
      const m = l.match(/^\s*from\s+([.\w]+)\s+import\s+/) ?? l.match(/^\s*import\s+([\w.]+)/);
      if (m) out.push({ spec: m[1], line: i + 1 });
    } else if (language === "Go") {
      const m = l.match(/^\s*(?:import\s+)?(?:\w+\s+)?"([^"]+)"\s*$/);
      if (m && (/^\s*import\b/.test(l) || /^\s+(?:\w+\s+)?"/.test(l))) out.push({ spec: m[1], line: i + 1 });
    }
  }
  return out;
}

const JS_EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

/** Resolve an import to another analyzed file in the same repo, or null (external / unresolved). */
export function resolveLocalImport(fromPath: string, spec: string, language: string | undefined, known: ReadonlySet<string>): string | null {
  if (language === "Python") {
    const cleaned = spec.replace(/^\.+/, "");
    if (!cleaned) return null;
    const rel = cleaned.replace(/\./g, "/");
    for (const c of [`${rel}.py`, `${rel}/__init__.py`]) {
      for (const p of known) if (p === c || p.endsWith(`/${c}`)) return p;
    }
    return null;
  }
  let target: string;
  if (spec.startsWith("@/") || spec.startsWith("~/")) target = spec.slice(2);
  else if (spec.startsWith(".")) {
    const base = fromPath.split("/").slice(0, -1);
    for (const seg of spec.split("/")) {
      if (seg === "." || seg === "") continue;
      if (seg === "..") base.pop();
      else base.push(seg);
    }
    target = base.join("/");
  } else return null;
  for (const ext of JS_EXTS) if (known.has(target + ext)) return target + ext;
  return null;
}

/** First line (1-based) matching a pattern, or null. */
export function findLine(content: string, re: RegExp): number | null {
  const lines = splitLines(content);
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
  return null;
}
