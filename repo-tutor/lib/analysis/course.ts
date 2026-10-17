import type { Course, CodeSnippet, Lesson, LessonSection, LearningPathItem, Quiz, QuizQuestion } from "../types";
import { SOURCE_LANGS } from "../github/filters";
import { splitLines } from "../grounding/citations";
import type { Evidence, FileInfo, RepoAnalysis } from "./analyze";

// Builds a learning path from RepoAnalysis facts. This is template-based and deterministic:
// no model is involved, and every statement is derived from files that were actually read.
// (The optional AI tutor is a separate, verified-and-labelled feature.)

export interface SourceForCourse {
  path: string;
  content: string;
  language?: string;
}
export interface GeneratedCourse {
  course: Course;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export const courseRepoId = (fullName: string) => fullName.toLowerCase().replace("/", "-").replace(/\./g, "-");

const PRISM: Record<string, string> = {
  TypeScript: "typescript", JavaScript: "javascript", Python: "python", Go: "go", Rust: "rust", Java: "java",
  JSON: "json", Markdown: "text", YAML: "text", TOML: "text",
};
const lang = (l?: string) => (l && PRISM[l]) || "text";

export function excerpt(f: SourceForCourse, startLine: number, maxLines = 24): CodeSnippet {
  const lines = splitLines(f.content);
  const start = Math.min(Math.max(1, startLine), Math.max(1, lines.length));
  const end = Math.min(lines.length, start + maxLines - 1);
  return {
    filename: f.path.split("/").pop() ?? f.path,
    path: f.path,
    language: lang(f.language),
    content: lines.slice(start - 1, end).join("\n"),
    startLine: start,
  };
}

const ref = (e?: Evidence) => (e ? `${e.path}:${e.startLine}${e.endLine !== e.startLine ? `-${e.endLine}` : ""}` : "");

// ─── deterministic shuffle ───────────────────────────────────
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: string) {
  let a = hash(seed);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle<T>(arr: T[], seed: string): T[] {
  const r = rng(seed); const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function mcq(id: string, question: string, correct: string, distractors: string[], explanation: string): QuizQuestion | null {
  const uniq = [...new Set(distractors.filter((d) => d && d !== correct))].slice(0, 3);
  if (uniq.length < 2) return null; // never pad with invented options
  const texts = shuffle([correct, ...uniq], id);
  const ids = ["a", "b", "c", "d"];
  const options = texts.map((text, i) => ({ id: ids[i], text }));
  return { id, question, options, correctOptionId: options.find((o) => o.text === correct)!.id, explanation };
}

const OTHER_LANGS = ["Python", "Go", "Rust", "Java", "Ruby", "PHP", "C#", "Swift", "Kotlin", "TypeScript", "JavaScript"];
const GENERIC_DIRS = ["docs", "scripts", "assets", "migrations", "public", "examples"];

export function buildCourse(a: RepoAnalysis, sources: SourceForCourse[]): GeneratedCourse {
  const byPath = new Map(sources.map((s) => [s.path, s]));
  const info = new Map(a.files.map((f) => [f.path, f]));
  const repoId = courseRepoId(a.repo.fullName);
  const lessons: Lesson[] = [];
  const quizzes: Quiz[] = [];
  const srcFiles = a.files.filter((f) => f.language && SOURCE_LANGS.has(f.language));

  const add = (key: string, title: string, objective: string, minutes: number, sections: LessonSection[], questions: (QuizQuestion | null)[]) => {
    lessons.push({ id: key, repoId, lessonNumber: lessons.length + 1, title, objective, estimatedMinutes: minutes, status: "not_started", sections });
    const qs = questions.filter((q): q is QuizQuestion => !!q);
    if (qs.length) quizzes.push({ lessonId: key, questions: qs });
  };

  // ── 1. Overview ─────────────────────────────────────────────
  {
    const sections: LessonSection[] = [];
    sections.push({
      type: "objectives",
      content: "By the end of this lesson you will:",
      items: [`Know what ${a.repo.fullName} says it does, in its own words`, "See which languages and technologies it uses, and which files prove it", "Know what this analysis could not determine"],
      hinglishContent: "Is lesson ke baad aap:",
      hinglishItems: [`${a.repo.fullName} khud kya kehta hai, uske apne words mein jaanenge`, "Kaun si languages aur technologies use hui hain — aur kaun si files iska saboot hain — dekhenge", "Yeh samjhenge ki is analysis ne kya verify nahi kiya"],
    });
    if (a.readme) {
      sections.push({
        type: "explanation",
        content: `From the README (${ref(a.readme.evidence)}):\n\n"${a.readme.excerpt}"`,
        hinglishContent: `README se (${ref(a.readme.evidence)}):\n\n"${a.readme.excerpt}"`,
      });
    } else {
      sections.push({ type: "explanation", content: "No README was found among the files that were read, so the project's purpose could not be verified from its own documentation.", hinglishContent: "Jin files ko padha gaya unmein README nahi mila, isliye project ka purpose uske apne documentation se verify nahi ho paya." });
    }
    if (a.languages.length) {
      const list = a.languages.slice(0, 5).map((l) => `${l.name} ${l.percent}% (${l.files} file${l.files > 1 ? "s" : ""})`).join(", ");
      sections.push({ type: "explanation", content: `Languages, by size of the source files that were read: ${list}.`, hinglishContent: `Jo source files padhi gayin unke size ke hisaab se languages: ${list}.` });
    }
    const manifest = a.manifests.find((m) => m.kind !== "docker");
    const mf = manifest && byPath.get(manifest.path);
    if (mf) sections.push({ type: "code", content: `The project's manifest, ${mf.path}:`, hinglishContent: `Project ka manifest, ${mf.path}:`, codeSnippet: excerpt(mf, 1, 28) });
    if (a.technologies.length) {
      sections.push({
        type: "breakdown", content: "Technologies detected (each is backed by a line in a manifest):", hinglishContent: "Detect hui technologies (har ek manifest ki kisi line se verify hui hai):",
        items: a.technologies.slice(0, 12).map((t) => `${t.name} — dependency "${t.via}" at ${ref(t.evidence)}`),
      });
    }
    sections.push({ type: "takeaways", content: "What this analysis could not verify:", hinglishContent: "Is analysis ne jo verify nahi kiya:", items: a.limitations.slice(0, 4), hinglishItems: a.limitations.slice(0, 4) });
    sections.push({ type: "exercise", content: `Open ${a.repo.htmlUrl} on GitHub. Does the README's description match the files you found? Note one thing the README claims that you cannot yet see in the code.`, hinglishContent: `GitHub par ${a.repo.htmlUrl} kholiye. Kya README ka description un files se match karta hai? README ki ek aisi baat likhiye jo abhi code mein dikhayi nahi deti.` });

    const top = a.languages[0];
    add("overview", `What is ${a.repo.name}?`, "Understand the project's stated purpose, languages and technologies, with evidence.", 8, sections, [
      top ? mcq(`${repoId}-overview-q1`, "Which language makes up the largest share of the source files that were read?", top.name,
        [...a.languages.slice(1, 4).map((l) => l.name), ...OTHER_LANGS.filter((l) => !a.languages.some((x) => x.name === l))].slice(0, 3),
        `The language breakdown above is computed from the files read: ${top.name} is ${top.percent}% of analyzed source bytes.`) : null,
      manifest ? mcq(`${repoId}-overview-q2`, "Which file lists this project's dependencies or metadata?", manifest.path,
        srcFiles.filter((f) => f.path !== manifest.path).slice(0, 3).map((f) => f.path),
        `${manifest.path} is the manifest that was parsed for dependencies.`) : null,
      a.technologies[0] ? mcq(`${repoId}-overview-q3`, `Where was ${a.technologies[0].name} detected?`, ref(a.technologies[0].evidence),
        [`${a.technologies[0].evidence.path}:${a.technologies[0].evidence.startLine + 40}`, `${a.technologies[0].evidence.path}:${Math.max(1, a.technologies[0].evidence.startLine - 1) + 90}`, `${srcFiles[0]?.path ?? "src/index"}:1`],
        `${a.technologies[0].name} is inferred from the dependency "${a.technologies[0].via}" at ${ref(a.technologies[0].evidence)}.`) : null,
    ]);
  }

  // ── 2. Layout ───────────────────────────────────────────────
  {
    const dirs = a.directories.slice(0, 10);
    const sections: LessonSection[] = [
      { type: "objectives", content: "In this lesson you will:", items: ["See how the analyzed files are spread across top-level folders", "Learn to treat folder names as hints, not proof"], hinglishContent: "Is lesson mein aap:", hinglishItems: ["Dekhenge ki analyzed files top-level folders mein kaise bati hain", "Folder ke naam ko hint maanna seekhenge, saboot nahi"] },
      { type: "breakdown", content: "Top-level folders among the files that were read:", hinglishContent: "Jo files padhi gayin unke top-level folders:", items: dirs.map((d) => `${d.path === "(root)" ? "(repository root)" : d.path + "/"} — ${d.fileCount} file${d.fileCount > 1 ? "s" : ""}${d.languages.length ? ` (${d.languages.join(", ")})` : ""}`) },
      { type: "explanation", content: "A folder's name suggests its role, but only the files inside prove it. Only a subset of the repository is read (see the limits above), so counts describe analyzed files, not the whole repository.", hinglishContent: "Folder ka naam uska role batata hai, lekin saboot sirf andar ki files deti hain. Repository ka sirf ek hissa padha jaata hai, isliye counts analyzed files ke hain, poori repository ke nahi." },
      { type: "takeaways", content: "Key takeaways:", hinglishContent: "Mukhya baatein:", items: [`${a.stats.analyzedFiles} of ${a.stats.repoFiles} repository files were analyzed`, "Large folders are usually the best place to look for core logic — but verify by reading them"], hinglishItems: [`${a.stats.repoFiles} mein se ${a.stats.analyzedFiles} files analyze hui`, "Bade folders mein aksar core logic hota hai — lekin padh kar verify karein"] },
      { type: "exercise", content: `Pick the folder with the most files (${dirs[0]?.path ?? "n/a"}) and open two files from it. Write one sentence on what that folder is responsible for.`, hinglishContent: `Sabse zyada files wala folder (${dirs[0]?.path ?? "n/a"}) chuniye aur usme se do files kholiye. Ek line likhiye ki yeh folder kis cheez ke liye zimmedar hai.` },
    ];
    const present = new Set(a.directories.map((d) => d.path));
    add("layout", "Project layout", "Learn how the analyzed files are organised.", 6, sections, [
      dirs.length >= 2 ? mcq(`${repoId}-layout-q1`, "Which top-level folder contains the most analyzed files?", dirs[0].path, [...dirs.slice(1, 4).map((d) => d.path), ...GENERIC_DIRS.filter((g) => !present.has(g))].slice(0, 3),
        `${dirs[0].path} has ${dirs[0].fileCount} analyzed files, more than any other top-level folder.`) : null,
    ]);
  }

  // ── 3. Entry points ─────────────────────────────────────────
  {
    const eps = a.entryPoints.slice(0, 3);
    const sections: LessonSection[] = [{ type: "objectives", content: "In this lesson you will:", items: ["Find where the program starts", "See how that was determined"], hinglishContent: "Is lesson mein aap:", hinglishItems: ["Dekhenge ki program kahan se shuru hota hai", "Yeh kaise pata chala, woh samjhenge"] }];
    if (eps.length) {
      sections.push({ type: "breakdown", content: "Entry points found:", hinglishContent: "Mile hue entry points:", items: eps.map((e) => `${e.path} — ${e.reason}${e.evidence ? ` (${ref(e.evidence)})` : ""}`) });
      const f = byPath.get(eps[0].path);
      if (f) sections.push({ type: "code", content: `Start reading at ${f.path}:`, hinglishContent: `${f.path} se padhna shuru kijiye:`, codeSnippet: excerpt(f, Math.max(1, (eps[0].evidence?.startLine ?? 1) - 2), 26) });
    } else {
      sections.push({ type: "explanation", content: "No entry point could be identified from the files that were read, so none is claimed here. Check the README or the manifest scripts.", hinglishContent: "Jo files padhi gayin unse koi entry point pehchana nahi ja saka, isliye yahan koi claim nahi kiya gaya. README ya manifest ke scripts dekhiye." });
    }
    sections.push({ type: "takeaways", content: "Key takeaways:", hinglishContent: "Mukhya baatein:", items: ["Entry points are found by rules (manifest fields, main() declarations, conventional names) — not by running the code", "Frameworks may start the app from configuration instead of a single file"], hinglishItems: ["Entry points rules se mile hain (manifest fields, main() declaration, conventional naam) — code chala kar nahi", "Frameworks kabhi kabhi ek file ki jagah configuration se app start karte hain"] });
    sections.push({ type: "exercise", content: "Follow the first import in the entry file to another file. What does that file export that the entry file uses?", hinglishContent: "Entry file ka pehla import follow karke dusri file par jaiye. Woh file kya export karti hai jo entry file use karti hai?" });
    const others = srcFiles.filter((f) => !eps.some((e) => e.path === f.path)).map((f) => f.path);
    add("entry-points", "Where the program starts", "Find the entry point(s) and understand how they were identified.", 8, sections, [
      eps.length ? mcq(`${repoId}-entry-q1`, "Which of these files was identified as an entry point?", eps[0].path, others.slice(0, 3), `${eps[0].path}: ${eps[0].reason}.`) : null,
    ]);
  }

  // ── 4. Key modules ──────────────────────────────────────────
  const entryPaths = new Set(a.entryPoints.map((e) => e.path));
  const inboundOf = (p: string) => a.files.filter((f) => f.imports.some((i) => i.resolved === p)).map((f) => f.path);
  const moduleFiles = a.readingOrder.map((o) => info.get(o.path)).filter((f): f is FileInfo => !!f && !!f.language && SOURCE_LANGS.has(f.language) && !entryPaths.has(f.path) && f.symbols.length > 0).slice(0, 4);
  for (const [i, f] of moduleFiles.entries()) {
    const src = byPath.get(f.path)!;
    const exported = f.symbols.filter((s) => s.exported);
    const shown = (exported.length ? exported : f.symbols).slice(0, 8);
    const local = f.imports.filter((im) => im.resolved);
    const external = [...new Set(f.imports.filter((im) => !im.resolved && !im.spec.startsWith(".")).map((im) => im.spec))].slice(0, 6);
    const who = inboundOf(f.path);
    const sections: LessonSection[] = [
      { type: "objectives", content: "In this lesson you will:", items: [`See what ${f.path} declares`, "See which files it depends on and which depend on it"], hinglishContent: "Is lesson mein aap:", hinglishItems: [`Dekhenge ki ${f.path} mein kya declare hua hai`, "Dekhenge ki yeh kin files par depend karti hai aur kaun isper depend karta hai"] },
      { type: "explanation", content: `${f.path} is ${f.lineCount} lines of ${f.language}. Declarations below were found by pattern matching, so nested or dynamic ones may be missing.`, hinglishContent: `${f.path} ${f.lineCount} lines ki ${f.language} file hai. Neeche ke declarations pattern matching se mile hain, isliye nested ya dynamic wale chhoot sakte hain.` },
      { type: "code", content: `Starting at the first declaration, ${f.path}:${shown[0].line}:`, hinglishContent: `Pehle declaration se, ${f.path}:${shown[0].line}:`, codeSnippet: excerpt(src, shown[0].line, 28) },
      { type: "breakdown", content: "Declarations (kind, name, line):", hinglishContent: "Declarations (kind, naam, line):", items: shown.map((s) => `${s.kind} ${s.name} — ${f.path}:${s.line}${s.exported ? " (exported)" : ""}`) },
    ];
    const rel: string[] = [
      ...local.slice(0, 5).map((im) => `imports ${im.resolved} (line ${im.line})`),
      ...who.slice(0, 5).map((p) => `is imported by ${p}`),
      ...external.map((e) => `uses external module "${e}"`),
    ];
    if (rel.length) sections.push({ type: "breakdown", content: "Relationships found in the files read:", hinglishContent: "Padhi gayi files mein mile relationships:", items: rel });
    sections.push({ type: "takeaways", content: "Key takeaways:", hinglishContent: "Mukhya baatein:", items: [`${f.path} declares ${f.symbols.length} top-level item${f.symbols.length > 1 ? "s" : ""}`, who.length ? `${who.length} other analyzed file${who.length > 1 ? "s" : ""} import it` : "No other analyzed file imports it (it may be used elsewhere or by configuration)"], hinglishItems: [`${f.path} mein ${f.symbols.length} top-level item hain`, who.length ? `${who.length} aur analyzed file ise import karti hain` : "Koi aur analyzed file ise import nahi karti"] });
    sections.push({ type: "exercise", content: `Pick the declaration \`${shown[0].name}\`. Find where else in the repository it is used (search on GitHub) and note one caller.`, hinglishContent: `Declaration \`${shown[0].name}\` chuniye. GitHub par search karke dekhiye yeh kahan aur use hota hai aur ek caller likhiye.` });

    const foreign = a.files.filter((x) => x.path !== f.path).flatMap((x) => x.symbols.map((s) => s.name)).filter((n) => !f.symbols.some((s) => s.name === n));
    add(`module-${i + 1}`, `Module: ${f.path.split("/").pop()}`, `Understand what ${f.path} declares and how it connects to other files.`, 10, sections, [
      mcq(`${repoId}-module-${i + 1}-q1`, `Which of these is declared in ${f.path}?`, shown[0].name, [...new Set(foreign)].slice(0, 3),
        `${shown[0].kind} ${shown[0].name} is declared at ${f.path}:${shown[0].line}.`),
      mcq(`${repoId}-module-${i + 1}-q2`, `On which line is ${shown[0].name} declared in ${f.path}?`, `line ${shown[0].line}`,
        [`line ${shown[0].line + 7}`, `line ${shown[0].line + 23}`, `line ${f.lineCount + 11}`], `${shown[0].name} is declared at ${f.path}:${shown[0].line}.`),
    ]);
  }

  // ── 5. Reading order ────────────────────────────────────────
  {
    const order = a.readingOrder.slice(0, 10);
    add("reading-order", "How to keep reading", "Get a recommended order for reading the rest of the repository.", 5, [
      { type: "objectives", content: "In this lesson you will:", items: ["Get a reading order based on evidence from the files read"], hinglishContent: "Is lesson mein aap:", hinglishItems: ["Padhi gayi files ke saboot par based reading order paayenge"] },
      { type: "breakdown", content: "Recommended order:", hinglishContent: "Suggested order:", items: order.map((o, i) => `${i + 1}. ${o.path} — ${o.reason}`) },
      { type: "exercise", content: "Read the first three files in this order and write a 3-sentence summary of the project. Then compare it with the README.", hinglishContent: "Is order ki pehli teen files padhiye aur project ka 3 line ka summary likhiye. Phir README se compare kijiye." },
    ], [
      order.length >= 2 ? mcq(`${repoId}-order-q1`, "Which file does the recommended reading order put first?", order[0].path, order.slice(1, 4).map((o) => o.path), `${order[0].path}: ${order[0].reason}.`) : null,
    ]);
  }

  const learningPath: LearningPathItem[] = lessons.map((l) => ({ id: l.id, lessonNumber: l.lessonNumber, title: l.title, objective: l.objective, estimatedMinutes: l.estimatedMinutes, status: "not_started" }));
  const course: Course = {
    repoId, title: `Learn ${a.repo.fullName}`,
    description: a.repo.description || `A guided reading of ${a.repo.fullName}, generated from its files.`,
    objectives: ["Understand the project's purpose from its own README", "Find the entry point and the key modules", "Know which claims are verified and which could not be"],
    totalLessons: lessons.length, estimatedHours: Math.max(0.5, Math.round((lessons.reduce((n, l) => n + l.estimatedMinutes, 0) / 60) * 10) / 10),
    learningPath, language: "english", skillLevel: "beginner",
  };
  return { course, lessons, quizzes };
}
