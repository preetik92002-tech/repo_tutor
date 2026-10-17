import { describe, it, expect } from "vitest";
import { escapeHtml, highlightLine } from "@/lib/ui/highlight";

// Reduce highlighted HTML back to the text a user would see.
const visible = (html: string) =>
  html.replace(/<span class="tok-[a-z]+">/g, "").replace(/<\/span>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

const SAMPLES = [
  '  "name": "shop",',
  'import express from "express";',
  "const x = { class: 'a', for: \"b\" }; // trailing comment with 'quotes'",
  "export function listProducts() {",
  "  return `template ${class_}`;",
  "if __name__ == '__main__':  # entry",
  "<img src=x onerror=alert(1)>",
  "a && b || c < d > e",
  "/* block */ const n = 42.5;",
  " * jsdoc line",
  "",
  "class Database { connect() {} }",
];

describe("highlightLine", () => {
  it.each(SAMPLES)("round-trips the visible text exactly: %j", (line) => {
    expect(visible(highlightLine(line, "typescript"))).toBe(line);
  });

  it("does not corrupt strings (regression: 'class' inside generated span tags)", () => {
    const html = highlightLine('  "name": "shop",', "json");
    expect(html).toBe('  <span class="tok-string">&quot;name&quot;</span>: <span class="tok-string">&quot;shop&quot;</span>,');
    expect(html).not.toMatch(/<span <span/);
  });

  it("emits only well-formed spans with fixed class names", () => {
    for (const line of SAMPLES) {
      const html = highlightLine(line, "typescript");
      const tags = html.match(/<[^>]*>/g) ?? [];
      for (const t of tags) expect(t).toMatch(/^<span class="tok-(comment|string|number|keyword|fn)">$|^<\/span>$/);
      expect((html.match(/<span /g) ?? []).length).toBe((html.match(/<\/span>/g) ?? []).length);
    }
  });

  it("cannot be used to inject markup", () => {
    const html = highlightLine('<script>alert("x")</script><img src=x onerror=alert(1)>', "typescript");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("classifies tokens", () => {
    const html = highlightLine("const n = 42; foo(1) // hi", "typescript");
    expect(html).toContain('<span class="tok-keyword">const</span>');
    expect(html).toContain('<span class="tok-number">42</span>');
    expect(html).toContain('<span class="tok-fn">foo</span>');
    expect(html).toContain('<span class="tok-comment">// hi</span>');
  });

  it("# is a comment only for Python-like languages", () => {
    expect(highlightLine("x = 1  # note", "python")).toContain('tok-comment">#');
    expect(highlightLine("const c = '#fff'; const p = a.#b;", "typescript")).not.toContain("tok-comment");
  });

  it("text language is escaped verbatim", () => {
    expect(highlightLine('a < b "c"', "text")).toBe(escapeHtml('a < b "c"'));
  });
});
