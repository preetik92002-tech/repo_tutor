import Link from "next/link";
import type { Repository } from "@/lib/types";
import { ArrowRightIcon } from "@/components/ui/Icons";

interface RepoCardProps {
  repo: Repository;
  actionLabel?: string;
}

export default function RepoCard({ repo, actionLabel = "Explore Course" }: RepoCardProps) {
  const categoryHeaderBg =
    repo.category === "frontend"
      ? "bg-sun"
      : repo.category === "fullstack"
      ? "bg-purple-soft"
      : "bg-fresh";

  const categoryLabel =
    repo.category === "frontend"
      ? "Frontend"
      : repo.category === "backend"
      ? "Backend"
      : "Full Stack";

  return (
    <Link
      href={`/repo/${repo.owner}/${repo.name}`}
      className="card card-pop group flex h-full flex-col overflow-hidden transition duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--ink)]"
    >
      {/* Top Banner Bar */}
      <div
        className={`flex items-center justify-between border-b-2 border-ink px-4 py-2 ${categoryHeaderBg}`}
      >
        <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
          {categoryLabel}
        </span>
        <span className="text-xs font-bold text-ink">Demo course</span>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3
          className="break-words font-mono text-lg font-extrabold tracking-tight text-ink"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {repo.owner}
          <span className="text-muted">/</span>
          {repo.name}
        </h3>

        <p className="text-sm text-muted leading-relaxed line-clamp-3">
          {repo.description}
        </p>

        {/* Technologies / Topics */}
        <ul className="flex flex-wrap gap-2" aria-label="Technologies">
          {repo.topics.slice(0, 4).map((t) => (
            <li key={t}>
              <span className="badge bg-white">{t}</span>
            </li>
          ))}
        </ul>

        {/* Footer Link */}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-extrabold text-purple group-hover:underline decoration-orange decoration-2 underline-offset-4">
          {actionLabel}
          <ArrowRightIcon
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
