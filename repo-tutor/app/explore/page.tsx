"use client";

import { useState, useMemo } from "react";
import RepoCard from "@/components/repository/RepoCard";
import { DEMO_REPOSITORIES } from "@/lib/demo/data";
import { SearchIcon } from "@/components/ui/Icons";
import type { RepoCategory } from "@/lib/types";

const CATEGORIES: { id: "all" | RepoCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "fullstack", label: "Full Stack" },
];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | RepoCategory>("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return DEMO_REPOSITORIES.filter((r) => {
      const matchesCat = category === "all" || r.category === category;
      const matchesSearch =
        !q ||
        r.fullName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.topics.some((t) => t.includes(q));
      return matchesCat && matchesSearch;
    });
  }, [query, category]);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
            style={{ color: "var(--ink)" }}
          >
            Find a Codebase
            <br />
            <span style={{ color: "var(--purple)" }}>Worth Understanding.</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--ink-muted)" }}>
            Browse our demo repository collection. Each one comes with a full structured learning course.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--ink-muted)" } as React.CSSProperties}
            />
            <input
              type="search"
              placeholder="Search repositories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 text-sm bg-white outline-none transition-all"
              style={{ borderColor: "var(--border)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--purple)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all whitespace-nowrap"
                style={
                  category === cat.id
                    ? { background: "var(--purple)", color: "#fff", borderColor: "var(--purple)" }
                    : { background: "var(--white)", color: "var(--ink-muted)", borderColor: "var(--border)" }
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState query={query} category={category} onReset={() => { setQuery(""); setCategory("all"); }} />
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
              {filtered.length} {filtered.length === 1 ? "repository" : "repositories"} found
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((r) => (
                <RepoCard key={r.id} repo={r} />
              ))}
            </div>
          </>
        )}

        {/* Demo note */}
        <div
          className="mt-14 p-5 rounded-2xl border-2 text-center"
          style={{ borderColor: "var(--yellow)", background: "#FFFDE7" }}
        >
          <p className="text-sm font-medium" style={{ color: "#78350f" }}>
            📚 <strong>Demo mode</strong> — These are hand-curated sample repositories. All courses use local content, not live GitHub data.
            A real backend can serve any public repository once built.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  query,
  category,
  onReset,
}: {
  query: string;
  category: string;
  onReset: () => void;
}) {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
        No repositories found
      </h3>
      <p style={{ color: "var(--ink-muted)" }}>
        {query && <>No matches for &quot;{query}&quot;. </>}
        {category !== "all" && <>No {category} repositories available. </>}
        Try a different search or category.
      </p>
      <button
        onClick={onReset}
        className="mt-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:opacity-80"
        style={{ borderColor: "var(--orange)", color: "var(--orange)", background: "var(--white)" }}
      >
        Clear filters
      </button>
    </div>
  );
}
