"use client";

import { useState } from "react";
import { api, ApiRequestError } from "@/lib/client/api";
import { AlertCircleIcon } from "@/components/ui/Icons";

interface Answer {
  status: "verified" | "partially_verified" | "unverified";
  answer: string;
  citations: { path: string; startLine: number; endLine: number; quote: string }[];
  rejected: { path: string; startLine: number; endLine: number; message: string }[];
  model: string;
  durationMs: number;
  statedInsufficientEvidence: boolean;
}

const BADGE: Record<Answer["status"], { label: string; cls: string; note: string }> = {
  verified: {
    label: "Citations checked",
    cls: "bg-fresh text-ink",
    note: "Every cited line range exists, contains the quoted text, and mentions the code the answer names. This does not guarantee the explanation itself is correct, so read the cited lines.",
  },
  partially_verified: {
    label: "Partly checked",
    cls: "bg-sun text-ink",
    note: "Some citations failed the check (listed below). Treat this answer with caution.",
  },
  unverified: {
    label: "Not verified",
    cls: "bg-[#fee2e2] text-[#991b1b]",
    note: "None of this answer's citations could be matched to the source. It may be wrong. Do not rely on it.",
  },
};

export default function AskTutor({ owner, name }: { owner: string; name: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [lang, setLang] = useState<"english" | "hinglish">("english");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (busy || q.trim().length < 3) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      setAnswer(await api<Answer>("/api/ask", { body: { owner, name, question: q.trim(), language: lang } }));
    } catch (err) {
      const e2 = err as ApiRequestError;
      setError({ message: e2.message, retryable: e2.retryable });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ask-heading" className="card border-2 border-ink bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="ask-heading" className="text-xl font-black text-ink">
          Ask the tutor
        </h2>
        <span className="badge bg-sun text-ink">Experimental</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Answers come from a small open-weight model running through Ollama. Small models often make mistakes, so every answer is checked against the real source and labelled. The lessons above do not depend on this model.
      </p>

      <form onSubmit={ask} className="mt-4 space-y-3">
        <label htmlFor="ask-q" className="sr-only">
          Your question about this repository
        </label>
        <textarea
          id="ask-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. How is a request timeout handled?"
          className="w-full rounded-[10px] border-2 border-ink bg-cream p-3 text-base text-ink focus:bg-white focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || q.trim().length < 3} className="btn btn-purple">
            {busy ? "Thinking… (can take a minute on a small PC)" : "Ask"}
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            Answer in
            <select value={lang} onChange={(e) => setLang(e.target.value as "english" | "hinglish")} className="rounded-lg border-2 border-ink bg-white px-2 py-1">
              <option value="english">English</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </label>
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border-2 border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm font-semibold text-[#991B1B]">
          <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
          <div>
            <p>{error.message}</p>
            {error.retryable && <p className="mt-1 font-normal">You can try again. No answer was generated, and nothing was substituted.</p>}
          </div>
        </div>
      )}

      {answer && (
        <div className="mt-4" role="status">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${BADGE[answer.status].cls}`}>{BADGE[answer.status].label}</span>
            <span className="text-xs text-muted">
              {answer.model} · {(answer.durationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink">{answer.answer}</p>
          {answer.statedInsufficientEvidence && (
            <p className="mt-2 text-sm font-semibold text-muted">The model said the provided source did not contain enough evidence to answer.</p>
          )}
          <p className="mt-2 text-xs text-muted">{BADGE[answer.status].note}</p>

          {answer.citations.length > 0 && (
            <ul className="mt-3 space-y-2">
              {answer.citations.map((c, i) => (
                <li key={i} className="rounded-lg border-2 border-ink bg-cream p-2 text-xs">
                  <span className="font-mono font-bold">
                    {c.path}:{c.startLine}
                    {c.endLine !== c.startLine ? `-${c.endLine}` : ""}
                  </span>
                  <span className="ml-2 font-mono text-muted">{c.quote}</span>
                </li>
              ))}
            </ul>
          )}
          {answer.rejected.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-[#991b1b]">
              {answer.rejected.map((r, i) => (
                <li key={i}>
                  Rejected citation <span className="font-mono">{r.path}:{r.startLine}-{r.endLine}</span>: {r.message}.
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
