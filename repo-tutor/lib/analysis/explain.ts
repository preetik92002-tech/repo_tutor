import type { FileExplanation, TreeNode } from "../types";
import type { RepoAnalysis } from "./analyze";

// Per-file explanations for the Code Explorer, derived only from analysis facts.

export function explainFile(a: RepoAnalysis, path: string): FileExplanation {
  const f = a.files.find((x) => x.path === path);
  if (!f) return { path, summary: "This file was not part of the analysis.", importantFunctions: [], relatedFiles: [] };

  const parts: string[] = [`${f.language ?? "Text"} file, ${f.lineCount} lines.`];
  const entry = a.entryPoints.find((e) => e.path === path);
  if (entry) parts.push(`Identified as an entry point: ${entry.reason}.`);
  const manifest = a.manifests.find((m) => m.path === path);
  if (manifest) parts.push(`Project manifest (${manifest.kind})${manifest.name ? ` for "${manifest.name}"` : ""} listing ${manifest.dependencies.length} dependencies.`);
  if (a.readme?.path === path) parts.push("The repository README.");
  const rank = a.readingOrder.findIndex((o) => o.path === path);
  if (rank >= 0) parts.push(`Reading-order position ${rank + 1}: ${a.readingOrder[rank].reason}.`);
  const importers = a.files.filter((x) => x.imports.some((i) => i.resolved === path)).map((x) => x.path);
  if (importers.length) parts.push(`Imported by ${importers.length} other analysed file${importers.length > 1 ? "s" : ""}.`);
  if (f.symbols.length) parts.push(`Declares ${f.symbols.length} top-level item${f.symbols.length > 1 ? "s" : ""} (found by pattern matching, so the list may be incomplete).`);
  else if (f.language && f.language !== "Markdown") parts.push("No top-level declarations were detected by the pattern matcher.");
  parts.push("This summary is generated from the file's structure, not by an AI model; it says what the file contains, not why it was written.");

  const related = [...new Set([...f.imports.filter((i) => i.resolved).map((i) => i.resolved!), ...importers])].slice(0, 8);
  return {
    path,
    summary: parts.join(" "),
    importantFunctions: f.symbols.slice(0, 12).map((s, i, arr) => ({
      name: s.name,
      description: `${s.exported ? "Exported " : ""}${s.kind} declared at line ${s.line}.`,
      lineStart: s.line,
      lineEnd: arr[i + 1] ? Math.max(s.line, arr[i + 1].line - 1) : f.lineCount,
    })),
    relatedFiles: related,
  };
}

/** Folder tree from analysed file paths only (never the whole repository listing). */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { id: "", name: "", path: "", type: "directory", children: [] };
  for (const p of [...paths].sort()) {
    const segs = p.split("/");
    let cur = root;
    segs.forEach((seg, i) => {
      const full = segs.slice(0, i + 1).join("/");
      const isFile = i === segs.length - 1;
      let next = cur.children!.find((c) => c.path === full && c.type === (isFile ? "file" : "directory"));
      if (!next) {
        next = { id: full, name: seg, path: full, type: isFile ? "file" : "directory", ...(isFile ? {} : { children: [] }) };
        cur.children!.push(next);
      }
      cur = next;
    });
  }
  const sortRec = (n: TreeNode) => {
    n.children?.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1));
    n.children?.forEach(sortRec);
  };
  sortRec(root);
  return root.children ?? [];
}
