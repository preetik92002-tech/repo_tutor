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
    const q = query.toLowerCase().trim();
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
    <div className="container-page py-10 sm:py-14">
      <p className="eyebrow">Explore</p>
      <h1 className="mt-2 max-w-3xl text-4xl sm:text-5xl text-ink">
        Find a Codebase Worth Understanding.
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Pick a demo repository to try a full guided course. More repositories arrive once the
        backend is connected.
      </p>

      <div className="mt-8">
        <div>
          {/* Search + Category Filter Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
              <label
                htmlFor="explore-search"
                className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted"
              >
                Search repositories
              </label>
              <div className="relative">
                <SearchIcon
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="explore-search"
                  type="search"
                  placeholder="Try react, next, or express"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-[10px] border-2 border-ink bg-white py-3 pl-10 pr-3 text-base text-ink focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={category === cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-lg border-2 border-ink px-3.5 py-2 text-sm font-bold transition ${
                    category === cat.id
                      ? "bg-purple text-white shadow-pop-sm"
                      : "bg-white text-ink hover:bg-sun"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="mt-5 text-sm text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "repository" : "repositories"} shown
          </p>

          {/* Repos Grid */}
          {filtered.length === 0 ? (
            <div className="card card-pop mt-6 p-10 text-center space-y-4">
              <div className="text-4xl">🔍</div>
              <h3 className="text-xl font-black text-ink">No repositories found</h3>
              <p className="text-sm text-muted max-w-md mx-auto">
                {query && <>No matches for &quot;{query}&quot;. </>}
                {category !== "all" && <>No {category} repositories available. </>}
                Try searching for another keyword or clearing your filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="btn btn-secondary"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <RepoCard key={r.id} repo={r} actionLabel="Start Learning" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
