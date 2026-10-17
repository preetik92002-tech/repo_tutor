import { describe, it, expect } from "vitest";
import { analyzeRepository } from "@/lib/analysis/analyze";
import { buildCourse } from "@/lib/analysis/course";
import { extractImports, extractSymbols, resolveLocalImport } from "@/lib/analysis/symbols";
import { verifyCitation, splitLines } from "@/lib/grounding/citations";
import { fixtureIngestion } from "./fixture";

const analysis = analyzeRepository(fixtureIngestion);
const sources = fixtureIngestion.files;
const content = (p: string) => sources.find((f) => f.path === p)!.content;

describe("symbols & imports", () => {
  it("finds exported declarations with correct 1-based lines", () => {
    const s = extractSymbols(content("src/db.ts"), "TypeScript");
    expect(s.map((x) => [x.name, x.kind, x.line, x.exported])).toEqual([
      ["MAX_ROWS", "const", 1, true], ["listProducts", "function", 3, true], ["Database", "class", 7, true],
    ]);
  });
  it("finds arrow functions, python defs and go funcs", () => {
    expect(extractSymbols(content("src/util/format.ts"), "TypeScript")[0]).toMatchObject({ name: "money", kind: "function", line: 1 });
    expect(extractSymbols("import os\n\ndef main():\n    pass\n\nclass A:\n    def m(self): pass\n", "Python").map((x) => x.name)).toEqual(["main", "A"]);
    expect(extractSymbols("package main\n\nfunc main() {}\nfunc (s *S) Run() {}\ntype S struct {}\n", "Go").map((x) => x.name)).toEqual(["main", "Run", "S"]);
  });
  it("resolves relative imports only to analyzed files", () => {
    const known = new Set(sources.map((f) => f.path));
    expect(resolveLocalImport("src/routes.ts", "./db", "TypeScript", known)).toBe("src/db.ts");
    expect(resolveLocalImport("src/routes.ts", "./util/format", "TypeScript", known)).toBe("src/util/format.ts");
    expect(resolveLocalImport("src/routes.ts", "express", "TypeScript", known)).toBeNull();
    expect(resolveLocalImport("src/routes.ts", "../../etc/passwd", "TypeScript", known)).toBeNull();
    expect(extractImports(content("src/routes.ts"), "TypeScript").map((i) => i.spec)).toEqual(["express", "./db", "./util/format"]);
  });
});

describe("analyzeRepository", () => {
  it("computes languages, technologies with line evidence, entry points and reading order", () => {
    expect(analysis.languages[0].name).toBe("TypeScript");
    const express = analysis.technologies.find((t) => t.name === "Express")!;
    expect(express.evidence.path).toBe("package.json");
    // evidence line must actually contain the dependency
    expect(splitLines(content("package.json"))[express.evidence.startLine - 1]).toContain('"express"');
    expect(analysis.entryPoints[0].path).toBe("src/index.ts");
    expect(analysis.readingOrder[0].path).toBe("README.md");
    expect(analysis.readingOrder.map((r) => r.path)).toContain("src/db.ts");
  });
  it("never claims technologies that are not in a manifest", () => {
    const names = analysis.technologies.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["Express", "Zod", "TypeScript"]));
    expect(names).not.toContain("React");
  });
  it("states limitations when evidence is missing", () => {
    const bare = analyzeRepository({ ...fixtureIngestion, files: fixtureIngestion.files.filter((f) => f.path.startsWith("src/util")) });
    const text = bare.limitations.join(" ");
    expect(text).toMatch(/No entry point/);
    expect(text).toMatch(/No dependency manifest/);
    expect(text).toMatch(/No README/);
    expect(bare.entryPoints).toEqual([]);
  });
  it("records import relationships", () => {
    const routes = analysis.files.find((f) => f.path === "src/routes.ts")!;
    expect(routes.imports.filter((i) => i.resolved).map((i) => i.resolved)).toEqual(["src/db.ts", "src/util/format.ts"]);
  });
});

describe("buildCourse", () => {
  const { course, lessons, quizzes } = buildCourse(analysis, sources);

  it("creates a consistent path with real lessons", () => {
    expect(course.totalLessons).toBe(lessons.length);
    expect(course.learningPath.map((l) => l.id)).toEqual(lessons.map((l) => l.id));
    expect(lessons.map((l) => l.id)).toEqual(expect.arrayContaining(["overview", "layout", "entry-points", "module-1", "reading-order"]));
  });

  it("every code snippet is a verbatim excerpt of the real file at the stated lines", () => {
    let checked = 0;
    for (const l of lessons) for (const s of l.sections) {
      if (!s.codeSnippet) continue;
      const src = splitLines(content(s.codeSnippet.path));
      const start = s.codeSnippet.startLine ?? 1;
      const got = s.codeSnippet.content.split("\n");
      expect(src.slice(start - 1, start - 1 + got.length)).toEqual(got);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });

  it("every 'path:line' reference in lessons resolves to a real line", () => {
    const re = /([\w./-]+\.\w+):(\d+)(?:-(\d+))?/g;
    let refs = 0;
    for (const l of lessons) for (const s of l.sections) {
      for (const text of [s.content, ...(s.items ?? [])]) for (const m of text.matchAll(re)) {
        const file = sources.find((f) => f.path === m[1]);
        if (!file) continue;
        const n = splitLines(file.content).length;
        expect(Number(m[2]), `${m[0]}`).toBeLessThanOrEqual(n);
        refs++;
      }
    }
    expect(refs).toBeGreaterThan(3);
  });

  it("module lessons describe symbols that really exist at the cited lines", () => {
    const mod = lessons.find((l) => l.id === "module-1")!;
    const items = mod.sections.find((s) => s.items?.some((i) => i.includes(" — ")))!.items!;
    for (const it of items.filter((i) => /^(function|class|const|type|interface|struct|enum) /.test(i))) {
      const m = it.match(/^\w+ (\S+) — (\S+):(\d+)/)!;
      expect(splitLines(content(m[2]))[Number(m[3]) - 1]).toContain(m[1]);
    }
  });

  it("quiz correct answers are true and options are distinct and non-invented", () => {
    expect(quizzes.length).toBeGreaterThan(0);
    for (const q of quizzes) for (const question of q.questions) {
      const texts = question.options.map((o) => o.text);
      expect(new Set(texts).size).toBe(texts.length);
      expect(texts.length).toBeGreaterThanOrEqual(3);
      expect(question.options.filter((o) => o.id === question.correctOptionId)).toHaveLength(1);
      expect(question.explanation.length).toBeGreaterThan(10);
    }
    const q = quizzes.find((x) => x.lessonId === "module-1")!.questions[0];
    const correct = q.options.find((o) => o.id === q.correctOptionId)!.text;
    const fileMatch = q.question.match(/declared in (\S+)\?/)![1];
    expect(content(fileMatch)).toContain(correct);
    for (const wrong of q.options.filter((o) => o.id !== q.correctOptionId)) expect(content(fileMatch)).not.toContain(`function ${wrong.text}`);
  });

  it("quizzes are deterministic", () => {
    const again = buildCourse(analysis, sources);
    expect(JSON.stringify(again.quizzes)).toBe(JSON.stringify(quizzes));
  });

  it("provides Hinglish text for scaffold sections and keeps identifiers intact", () => {
    const over = lessons.find((l) => l.id === "layout")!;
    expect(over.sections.every((s) => s.hinglishContent)).toBe(true);
    expect(over.sections.find((s) => s.type === "exercise")!.hinglishContent).toMatch(/src|root/);
  });

  it("does not invent a quiz when facts are too thin", () => {
    const bare = analyzeRepository({ ...fixtureIngestion, files: fixtureIngestion.files.filter((f) => f.path === "src/util/format.ts") });
    const r = buildCourse(bare, [fixtureIngestion.files.find((f) => f.path === "src/util/format.ts")!]);
    const entry = r.quizzes.find((q) => q.lessonId === "entry-points");
    expect(entry).toBeUndefined();
  });
});

describe("grounding integration", () => {
  it("evidence from analysis passes the citation verifier", () => {
    const e = analysis.technologies.find((t) => t.name === "Express")!.evidence;
    const line = splitLines(content("package.json"))[e.startLine - 1].trim();
    expect(verifyCitation(sources, { path: e.path, startLine: e.startLine, endLine: e.endLine, quote: line }, "`express` is a dependency")).toEqual({ ok: true });
  });
});
