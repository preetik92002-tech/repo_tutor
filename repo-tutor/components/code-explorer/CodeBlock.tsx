import React from "react";
import type { CodeSnippet } from "@/lib/types";

interface CodeBlockProps {
  snippet: CodeSnippet;
  showLineNumbers?: boolean;
}

// Simple syntax highlighter — applies CSS classes based on patterns
function highlightCode(code: string, language: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const highlighted = highlightLine(line, language);
    return (
      <div key={i} className="flex">
        <span className="code-line-number select-none pr-4 text-right" style={{ minWidth: "2.5rem", color: "#585b70" }}>
          {i + 1}
        </span>
        <span className="flex-1" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    );
  });
}

function highlightLine(line: string, lang: string): string {
  if (lang === "text") return escapeHtml(line);

  let result = escapeHtml(line);

  // Comments
  result = result.replace(
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g,
    '<span class="token-comment">$1</span>'
  );

  // Strings
  result = result.replace(
    /(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;|`[^`]*`)/g,
    '<span class="token-string">$1</span>'
  );

  // Keywords
  const keywords = /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|async|await|new|this|default|null|undefined|true|false|void|typeof|instanceof)\b/g;
  result = result.replace(keywords, '<span class="token-keyword">$1</span>');

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function CodeBlock({ snippet, showLineNumbers = true }: CodeBlockProps) {
  const lines = snippet.content.split("\n");

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: "#313244" }}
    >
      {/* File header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "#181825", borderColor: "#313244" }}
      >
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#f38ba8" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#f9e2af" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#a6e3a1" }} />
          </div>
          <span
            className="text-xs font-mono ml-2"
            style={{ color: "#a6adc8" }}
          >
            {snippet.path || snippet.filename}
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: "#313244", color: "#a6adc8" }}
        >
          {snippet.language}
        </span>
      </div>

      {/* Code */}
      <div
        className="code-block overflow-x-auto p-4 text-sm leading-relaxed"
        style={{ background: "var(--code-bg)" }}
      >
        <pre>
          {showLineNumbers
            ? highlightCode(snippet.content, snippet.language)
            : lines.map((line, i) => (
                <div key={i}>{line || " "}</div>
              ))}
        </pre>
      </div>
    </div>
  );
}
