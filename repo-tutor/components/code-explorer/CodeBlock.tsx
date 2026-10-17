import React from "react";
import type { CodeSnippet } from "@/lib/types";
import { highlightLine } from "@/lib/ui/highlight";

interface CodeBlockProps {
  snippet: CodeSnippet;
  showLineNumbers?: boolean;
}

function highlightCode(
  code: string,
  language: string,
  highlightedLines: number[] = [],
  startLine = 1
): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const lineNum = i + startLine; // real file line number when the snippet is an excerpt
    const isHighlighted = highlightedLines.includes(lineNum);
    const highlighted = highlightLine(line, language);

    return (
      <div
        key={i}
        className={`flex px-2 ${isHighlighted ? "bg-sun/40" : ""}`}
      >
        <span
          aria-hidden="true"
          className="w-9 shrink-0 select-none pr-3 text-right text-muted/70 font-mono text-xs"
        >
          {lineNum}
        </span>
        <span
          className="whitespace-pre pr-4 font-mono text-[13px] leading-6"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    );
  });
}

export default function CodeBlock({
  snippet,
  showLineNumbers = true,
}: CodeBlockProps) {
  const highlightedLines = snippet.highlightedLines || [];

  return (
    <figure className="card overflow-hidden">
      {/* File Header */}
      <figcaption className="flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-2 font-mono text-xs font-bold">
        <div className="flex items-center gap-2 min-w-0">
          <span aria-hidden="true" className="flex gap-1.5 shrink-0">
            <i className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-orange block" />
            <i className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-sun block" />
            <i className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-fresh block" />
          </span>
          <span className="min-w-0 truncate text-ink">
            {snippet.path || snippet.filename}
          </span>
        </div>
        <span className="badge bg-white text-muted text-[11px] uppercase tracking-wider shrink-0">
          {snippet.language}
        </span>
      </figcaption>

      {/* Code Area */}
      <div className="code-scroll bg-white py-3">
        <pre
          className="m-0 min-w-max font-mono text-[13px] leading-6"
          tabIndex={0}
          aria-label={`Code of ${snippet.path || snippet.filename}`}
        >
          <code>
            {showLineNumbers
              ? highlightCode(snippet.content, snippet.language, highlightedLines, snippet.startLine ?? 1)
              : snippet.content.split("\n").map((line, i) => (
                  <div key={i} className="px-4">
                    {line || " "}
                  </div>
                ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
