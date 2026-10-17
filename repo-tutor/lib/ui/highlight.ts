// Single-pass syntax highlighter for the code viewer.
//
// The previous implementation ran several regex passes over HTML it had already generated, so a later
// "keyword" pass rewrote the word `class` inside its own <span class="..."> tags and corrupted every line
// containing a string. This version tokenises the ORIGINAL text once, escapes every piece exactly once,
// and only ever emits spans with fixed class names, so repository content can never inject markup.

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const KEYWORDS = new Set(
  (
    "import export from const let var function return if else for while class interface type extends implements async await new this default null undefined true false void typeof instanceof " +
    "def elif lambda pass None True False self try except finally raise with as in is not and or yield " +
    "func struct package go defer chan range select switch case break continue enum static public private protected final throw throws catch fn pub mut impl use mod"
  ).split(" "),
);

// Order matters: comments, strings, numbers, identifiers.
const BLOCK_COMMENT = String.raw`\/\*.*?\*\/|\/\*.*$|^\s*\*(?!\w).*$`;
const TOKEN_RE = (hashComments: boolean) =>
  new RegExp(
    `(${BLOCK_COMMENT}|\\/\\/.*$${hashComments ? "|#.*$" : ""})` + // 1 comment
      `|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)` + // 2 string
      `|(\\b\\d+(?:\\.\\d+)?\\b)` + // 3 number
      `|([A-Za-z_$][\\w$]*)`, // 4 identifier
    "g",
  );

const span = (cls: string, text: string) => `<span class="${cls}">${escapeHtml(text)}</span>`;

export function highlightLine(line: string, lang: string): string {
  if (lang === "text") return escapeHtml(line);
  const re = TOKEN_RE(lang === "python" || lang === "shell");
  let out = "";
  let last = 0;
  for (const m of line.matchAll(re)) {
    const start = m.index ?? 0;
    out += escapeHtml(line.slice(last, start));
    const [text, comment, str, num, ident] = m;
    if (comment !== undefined) out += span("tok-comment", text);
    else if (str !== undefined) out += span("tok-string", text);
    else if (num !== undefined) out += span("tok-number", text);
    else if (ident !== undefined) {
      const callsNext = /^\s*\(/.test(line.slice(start + text.length));
      if (KEYWORDS.has(text)) out += span("tok-keyword", text);
      else if (callsNext) out += span("tok-fn", text);
      else out += escapeHtml(text);
    } else out += escapeHtml(text);
    last = start + text.length;
  }
  return out + escapeHtml(line.slice(last));
}
