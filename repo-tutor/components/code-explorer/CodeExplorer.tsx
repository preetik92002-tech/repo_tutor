"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { Repository, TreeNode, FileExplanation, CodeSnippet } from "@/lib/types";
import { getFileExplanation, getCodeFile } from "@/lib/services";
import { api } from "@/lib/client/api";
import CodeBlock from "./CodeBlock";
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  FileTextIcon,
  SearchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  ZapIcon,
} from "@/components/ui/Icons";

interface CodeExplorerProps {
  repo: Repository;
  tree: TreeNode[];
  /**
   * Live mode: files come from a real analysis (fetched on demand from the server) and the
   * explanation panel is generated from the analysis. Absent = bundled demo content.
   */
  live?: { explanations: Record<string, FileExplanation>; initialPath?: string };
}

export default function CodeExplorer({ repo, tree, live }: CodeExplorerProps) {
  // Find first file in tree for initial selection
  const firstFilePath = useMemo(() => {
    if (live?.initialPath) return live.initialPath;
    function findFirstFile(nodes: TreeNode[]): string {
      for (const node of nodes) {
        if (node.type === "file") return node.path;
        if (node.children) {
          const found = findFirstFile(node.children);
          if (found) return found;
        }
      }
      return "";
    }
    return findFirstFile(tree);
  }, [tree, live?.initialPath]);

  const [selectedPath, setSelectedPath] = useState<string>(firstFilePath);
  const [searchQuery, setSearchQuery] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(
    live
      ? Object.fromEntries(tree.filter((n) => n.type === "directory").map((n) => [n.path, true]))
      : {
    packages: true,
    "packages/react": true,
    "packages/react/src": true,
    lib: true,
    "lib/router": true,
    "packages/next": true,
    "packages/next/src": true,
    }
  );
  const [mobileTab, setMobileTab] = useState<"files" | "code" | "explanation">("code");

  const [highlight, setHighlight] = useState<number[]>([]);
  const [fetched, setFetched] = useState<{ path: string; snippet?: CodeSnippet; error?: string } | null>(null);

  // Live mode: load the real (stored, secret-redacted) file from the server.
  useEffect(() => {
    if (!live || !selectedPath) return;
    let cancelled = false;
    api<{ path: string; language: string | null; content: string }>(
      `/api/repo/${repo.owner}/${repo.name}/file?path=${encodeURIComponent(selectedPath)}`
    )
      .then((f) => {
        if (cancelled) return;
        const lang = f.language ? f.language.toLowerCase() : "text";
        setFetched({
          path: selectedPath,
          snippet: { filename: selectedPath.split("/").pop() ?? selectedPath, path: selectedPath, language: lang === "json" || lang === "typescript" || lang === "javascript" || lang === "python" ? lang : "text", content: f.content },
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setFetched({ path: selectedPath, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [live, repo.owner, repo.name, selectedPath]);

  const loadingLive = !!live && fetched?.path !== selectedPath;
  const liveError = live && fetched?.path === selectedPath ? fetched.error : undefined;

  // Get current file code & explanation
  const currentSnippet: CodeSnippet = useMemo(() => {
    if (live) {
      if (fetched?.path === selectedPath && fetched.snippet) return { ...fetched.snippet, highlightedLines: highlight };
      return { filename: selectedPath.split("/").pop() ?? "", path: selectedPath, language: "text", content: loadingLive ? "Loading…" : liveError ?? "" };
    }
    return getCodeFile(selectedPath);
  }, [live, fetched, selectedPath, highlight, loadingLive, liveError]);

  const currentExplanation: FileExplanation = useMemo(() => {
    if (live) return live.explanations[selectedPath] ?? { path: selectedPath, summary: "This file was not part of the analysis.", importantFunctions: [], relatedFiles: [] };
    return getFileExplanation(selectedPath);
  }, [live, selectedPath]);

  function toggleFolder(folderPath: string) {
    setOpenFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  }

  function handleSelectFile(path: string) {
    setHighlight([]);
    setSelectedPath(path);
    setMobileTab("code");
  }

  // Filter tree nodes by search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();

    function filterNodes(nodes: TreeNode[]): TreeNode[] {
      const result: TreeNode[] = [];
      for (const node of nodes) {
        if (node.type === "file") {
          if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
            result.push(node);
          }
        } else if (node.children) {
          const matchingChildren = filterNodes(node.children);
          if (matchingChildren.length > 0 || node.name.toLowerCase().includes(q)) {
            result.push({
              ...node,
              children: matchingChildren,
            });
          }
        }
      }
      return result;
    }

    return filterNodes(tree);
  }, [tree, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)" }}>
      {/* ─── Breadcrumb & Top Bar ──────────────────────── */}
      <div
        className="border-b px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-16 z-30"
        style={{ background: "var(--white)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 text-xs sm:text-sm overflow-hidden whitespace-nowrap">
          <Link
            href="/"
            className="hover:opacity-70 transition-opacity font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            Home
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link
            href={`/repo/${repo.owner}/${repo.name}`}
            className="hover:opacity-70 transition-opacity font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            {repo.fullName}
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="font-bold truncate" style={{ color: "var(--ink)" }}>
            Code Explorer
          </span>
        </div>

        <Link
          href={`/repo/${repo.owner}/${repo.name}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-black/5 transition-all"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <ArrowLeftIcon size={14} />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* ─── Mobile Tab Switcher ────────────────────────── */}
      <div
        className="lg:hidden flex border-b px-4 py-2 gap-2"
        style={{ background: "var(--white)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setMobileTab("files")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            mobileTab === "files" ? "text-white" : ""
          }`}
          style={{
            background: mobileTab === "files" ? "var(--purple)" : "var(--cream)",
            color: mobileTab === "files" ? "#fff" : "var(--ink-muted)",
          }}
        >
          Files
        </button>
        <button
          onClick={() => setMobileTab("code")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            ""
          }`}
          style={{
            background: mobileTab === "code" ? "var(--orange)" : "var(--cream)",
            color: mobileTab === "code" ? "var(--ink)" : "var(--ink-muted)",
          }}
        >
          Code
        </button>
        <button
          onClick={() => setMobileTab("explanation")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            mobileTab === "explanation" ? "text-white" : ""
          }`}
          style={{
            background: mobileTab === "explanation" ? "var(--green)" : "var(--cream)",
            color: mobileTab === "explanation" ? "var(--ink)" : "var(--ink-muted)",
          }}
        >
          Explanation
        </button>
      </div>

      <h1 className="sr-only">Code Explorer</h1>
      {/* ─── Main 3-Column Interface ───────────────────── */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── Column 1: File Tree (3 cols) ──────────────── */}
        <div
          className={`${
            mobileTab === "files" ? "block" : "hidden"
          } lg:block lg:col-span-3 rounded-2xl border-2 bg-white p-4 sticky top-32`}
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
              Repository Files
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--cream)", color: "var(--purple)" }}>
              {live ? "Analysed files" : "Demo Tree"}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative mb-3">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--ink-muted)" } as React.CSSProperties}
            />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-white outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* Tree nodes list */}
          <div className="space-y-0.5 overflow-y-auto max-h-[calc(100vh-280px)] text-sm">
            {filteredTree.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--ink-muted)" }}>
                No matching files
              </p>
            ) : (
              filteredTree.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  selectedPath={selectedPath}
                  openFolders={openFolders}
                  onToggleFolder={toggleFolder}
                  onSelectFile={handleSelectFile}
                  depth={0}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── Column 2: Code Viewer (6 cols) ────────────── */}
        <div
          className={`${
            mobileTab === "code" ? "block" : "hidden"
          } lg:block lg:col-span-6 space-y-4`}
        >
          <div
            className="p-4 rounded-2xl border-2 bg-white flex items-center justify-between gap-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FileTextIcon size={18} style={{ color: "var(--purple)" } as React.CSSProperties} />
              <div className="min-w-0">
                <h3 className="font-bold text-sm truncate" style={{ color: "var(--ink)" }}>
                  {currentSnippet.filename}
                </h3>
                <p className="text-xs truncate font-mono" style={{ color: "var(--ink-muted)" }}>
                  {currentSnippet.path}
                </p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold px-2 py-1 rounded-md" style={{ background: "var(--cream)", color: "var(--ink)" }}>
              {currentSnippet.language}
            </div>
          </div>

          {/* Syntax Highlighted Code Viewer */}
          <CodeBlock snippet={currentSnippet} showLineNumbers={true} />
        </div>

        {/* ─── Column 3: File Explanation (3 cols) ───────── */}
        <div
          className={`${
            mobileTab === "explanation" ? "block" : "hidden"
          } lg:block lg:col-span-3 space-y-4 sticky top-32`}
        >
          {/* File Summary Card */}
          <div
            className="p-5 rounded-2xl border-2 bg-white space-y-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider" style={{ color: "var(--orange-text)" }}>
              <BookOpenIcon size={14} />
              <span>What this file does</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              {currentExplanation.summary}
            </p>
          </div>

          {/* Important Functions */}
          {currentExplanation.importantFunctions.length > 0 && (
            <div
              className="p-5 rounded-2xl border-2 bg-white space-y-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider" style={{ color: "var(--purple)" }}>
                <ZapIcon size={14} />
                <span>Key Exports & Logic</span>
              </div>
              <div className="space-y-2.5">
                {currentExplanation.importantFunctions.map((fn, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs ${live && fn.lineStart ? "cursor-pointer hover:bg-black/5" : ""}`}
                    style={{ background: "var(--cream)", borderColor: "var(--border)" }}
                    role={live && fn.lineStart ? "button" : undefined}
                    tabIndex={live && fn.lineStart ? 0 : undefined}
                    onClick={live && fn.lineStart ? () => setHighlight([fn.lineStart!]) : undefined}
                    onKeyDown={live && fn.lineStart ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHighlight([fn.lineStart!]); } } : undefined}
                  >
                    <div className="font-mono font-bold text-xs" style={{ color: "var(--purple)" }}>
                      {fn.name}
                    </div>
                    <div className="mt-1 leading-snug" style={{ color: "var(--ink-muted)" }}>
                      {fn.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Files */}
          {currentExplanation.relatedFiles.length > 0 && (
            <div
              className="p-5 rounded-2xl border-2 bg-white space-y-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                Related Files
              </h4>
              <div className="space-y-1.5">
                {currentExplanation.relatedFiles.map((relPath) => (
                  <button
                    key={relPath}
                    onClick={() => handleSelectFile(relPath)}
                    className="w-full text-left p-2 rounded-lg border text-xs font-mono flex items-center justify-between hover:bg-black/5 transition-all truncate"
                    style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                  >
                    <span className="truncate">{relPath}</span>
                    <ChevronRightIcon size={12} className="shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Recursive Tree Node Component ────────────────────────────

function TreeNodeItem({
  node,
  selectedPath,
  openFolders,
  onToggleFolder,
  onSelectFile,
  depth,
}: {
  node: TreeNode;
  selectedPath: string;
  openFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  depth: number;
}) {
  const isDirectory = node.type === "directory";
  const isOpen = Boolean(openFolders[node.path]);
  const isSelected = !isDirectory && selectedPath === node.path;

  if (isDirectory) {
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          className="w-full text-left flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-black/5 transition-all text-xs font-medium"
          style={{ paddingLeft: `${depth * 14 + 8}px`, color: "var(--ink)" }}
        >
          {isOpen ? (
            <ChevronDownIcon size={12} className="shrink-0 opacity-60" />
          ) : (
            <ChevronRightIcon size={12} className="shrink-0 opacity-60" />
          )}
          {isOpen ? (
            <FolderOpenIcon size={14} className="shrink-0" style={{ color: "var(--orange-text)" } as React.CSSProperties} />
          ) : (
            <FolderIcon size={14} className="shrink-0" style={{ color: "var(--orange-text)" } as React.CSSProperties} />
          )}
          <span className="truncate">{node.name}</span>
        </button>

        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                selectedPath={selectedPath}
                openFolders={openFolders}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full text-left flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-mono transition-all truncate ${
        isSelected ? "font-bold shadow-xs" : "hover:bg-black/5 opacity-80 hover:opacity-100"
      }`}
      style={{
        paddingLeft: `${depth * 14 + 18}px`,
        background: isSelected ? "#F0EBFF" : "transparent",
        color: isSelected ? "var(--purple)" : "var(--ink)",
      }}
    >
      <FileIcon size={13} className="shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
