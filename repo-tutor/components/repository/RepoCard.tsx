import Link from "next/link";
import type { Repository } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { StarIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface RepoCardProps {
  repo: Repository;
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export default function RepoCard({ repo }: RepoCardProps) {
  const categoryColors: Record<string, "orange" | "purple" | "green"> = {
    frontend: "orange",
    backend: "purple",
    fullstack: "green",
  };

  return (
    <article
      className="flex flex-col p-5 rounded-2xl border-2 bg-white hover:border-opacity-80 transition-all hover:shadow-md group"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3
            className="font-bold text-base leading-tight"
            style={{ color: "var(--ink)" }}
          >
            {repo.fullName}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
            <StarIcon size={11} />
            <span>{formatStars(repo.stars)}</span>
          </div>
        </div>
        <Badge variant={categoryColors[repo.category] ?? "muted"}>
          {repo.category}
        </Badge>
      </div>

      {/* Description */}
      <p
        className="text-sm leading-relaxed flex-1 mb-4"
        style={{ color: "var(--ink-muted)" }}
      >
        {repo.description}
      </p>

      {/* Topics */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {repo.topics.slice(0, 4).map((t) => (
          <Badge key={t} variant="muted">
            {t}
          </Badge>
        ))}
      </div>

      {/* Action */}
      <Link
        href={`/repo/${repo.owner}/${repo.name}`}
        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all group-hover:opacity-90"
        style={{
          background: "var(--cream)",
          color: "var(--orange)",
          border: "2px solid var(--orange)",
        }}
      >
        Explore Course
        <ArrowRightIcon size={14} />
      </Link>
    </article>
  );
}
