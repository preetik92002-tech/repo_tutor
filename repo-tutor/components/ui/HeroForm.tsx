"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, ArrowRightIcon } from "@/components/ui/Icons";
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
      setError("Please enter a public GitHub repository URL.");
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

  return (
    <form
      id="start"
      noValidate
      onSubmit={handleSubmit}
      className={`card card-pop scroll-mt-24 space-y-5 p-5 sm:p-6 ${compact ? "max-w-md" : ""}`}
      aria-label="Start learning a repository"
    >
      {/* URL Input */}
      <div>
        <label
          htmlFor="hero-repo-url"
          className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted"
        >
          GitHub repository
        </label>
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          >
            <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
            <line x1="8" x2="16" y1="12" y2="12"></line>
          </svg>
          <input
            id="hero-repo-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            placeholder="Paste a public GitHub repository URL..."
            className="w-full rounded-[10px] border-2 border-ink bg-cream py-3 pl-10 pr-3 text-base text-ink placeholder:text-muted/70 focus:bg-white focus:outline-none"
            aria-describedby={error ? "url-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
        {error && (
          <p
            id="url-error"
            className="mt-2 text-sm font-semibold flex items-start gap-1.5 text-[#dc2626]"
          >
            <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* Language & Skill Level Selectors (Segmented Radio Buttons) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
            Language
          </legend>
          <div className="flex flex-wrap gap-2">
            <label
              className={`cursor-pointer rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple ${
                language === "english"
                  ? "bg-purple text-white shadow-pop-sm"
                  : "bg-white text-ink hover:bg-sun"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="hero-language"
                checked={language === "english"}
                onChange={() => setLanguage("english")}
              />
              English
            </label>
            <label
              className={`cursor-pointer rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple ${
                language === "hinglish"
                  ? "bg-purple text-white shadow-pop-sm"
                  : "bg-white text-ink hover:bg-sun"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="hero-language"
                checked={language === "hinglish"}
                onChange={() => setLanguage("hinglish")}
              />
              Hinglish
            </label>
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
            Skill level
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["beginner", "intermediate", "advanced"] as SkillLevel[]).map((lvl) => (
              <label
                key={lvl}
                className={`cursor-pointer rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold capitalize transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple ${
                  level === lvl
                    ? "bg-purple text-white shadow-pop-sm"
                    : "bg-white text-ink hover:bg-sun"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="hero-skill-level"
                  checked={level === lvl}
                  onChange={() => setLevel(lvl)}
                />
                {lvl}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* CTA Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg w-full sm:w-auto"
      >
        {loading ? "Loading Course..." : "Teach Me This Repo"}
        {!loading && <ArrowRightIcon size={18} />}
      </button>
    </form>
  );
}
