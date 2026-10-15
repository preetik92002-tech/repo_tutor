"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, AlertCircleIcon } from "@/components/ui/Icons";
import { parseGitHubUrl, getDemoRepository } from "@/lib/services";
import type { LanguagePreference, SkillLevel } from "@/lib/types";

interface HeroFormProps {
  compact?: boolean;
}

export default function HeroForm({ compact = false }: HeroFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<LanguagePreference>("english");
  const [level, setLevel] = useState<SkillLevel>("beginner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("That doesn't look like a valid GitHub URL. Try: https://github.com/owner/repo");
      return;
    }

    const demo = getDemoRepository(parsed.owner, parsed.name);
    if (!demo) {
      setError(
        `"${parsed.owner}/${parsed.name}" isn't in our demo set yet. Try one of the featured repositories below.`
      );
      return;
    }

    setLoading(true);
    router.push(`/repo/${parsed.owner}/${parsed.name}`);
  }

  const selectClass =
    "w-full px-3 py-2.5 rounded-lg border text-sm font-medium bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2";

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4"}>
      {/* URL input */}
      <div>
        <label htmlFor="repo-url" className="block text-sm font-semibold mb-1.5" style={{ color: "var(--ink)" }}>
          GitHub Repository URL
        </label>
        <input
          id="repo-url"
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="Paste a public GitHub repository URL..."
          className="w-full px-4 py-3 rounded-xl border-2 text-sm bg-white outline-none transition-all"
          style={{
            borderColor: error ? "#f87171" : "var(--border)",
            boxShadow: error ? "0 0 0 3px rgba(248,113,113,0.15)" : undefined,
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--orange)";
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--border)";
          }}
          aria-describedby={error ? "url-error" : undefined}
          aria-invalid={!!error}
        />
        {error && (
          <p id="url-error" className="mt-2 text-sm flex items-start gap-1.5" style={{ color: "#dc2626" }}>
            <AlertCircleIcon size={15} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* Language + Level selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="language" className="block text-xs font-semibold mb-1" style={{ color: "var(--ink-muted)" }}>
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
            className={selectClass}
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            <option value="english">English</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>
        <div>
          <label htmlFor="level" className="block text-xs font-semibold mb-1" style={{ color: "var(--ink-muted)" }}>
            Skill Level
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value as SkillLevel)}
            className={selectClass}
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-base transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--orange)" }}
      >
        {loading ? "Loading..." : "Teach Me This Repo"}
        {!loading && <ArrowRightIcon size={18} />}
      </button>
    </form>
  );
}
