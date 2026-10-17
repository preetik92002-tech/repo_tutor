import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import ExploreBrowser from "@/components/repository/ExploreBrowser";
import { getDb } from "@/lib/db";
import { listAnalyzedRepos } from "@/lib/db/store";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Explore — Repo Tutor",
  description: "Sample courses and repositories analysed by Repo Tutor.",
};

export default function ExplorePage() {
  return (
    <>
      <ExploreBrowser />
      <Suspense fallback={null}>
        <AnalysedRepos />
      </Suspense>
    </>
  );
}

async function AnalysedRepos() {
  await connection();
  const repos = listAnalyzedRepos(getDb(), 24);
  if (repos.length === 0) return null;
  return (
    <section aria-labelledby="analysed" className="container-page pb-14">
      <h2 id="analysed" className="text-2xl sm:text-3xl text-ink">
        Analysed from real files
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Repositories that people have submitted to this Repo Tutor instance. These courses are built from the actual repository files, not from demo content.
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map((r) => (
          <li key={r.slug}>
            <Link href={`/repo/${r.owner}/${r.name}`} className="card card-pop block h-full p-5 transition hover:-translate-y-0.5">
              <span className="badge bg-fresh text-ink">Live analysis</span>
              <h3 className="mt-2 break-words font-mono text-lg font-extrabold text-ink">
                {r.owner}
                <span className="text-muted">/</span>
                {r.name}
              </h3>
              <p className="mt-1 line-clamp-3 text-sm text-muted">{r.description || "No description provided."}</p>
              <p className="mt-3 text-xs text-muted">
                {r.language || "Unknown language"} · analysed {new Date(r.analyzedAt).toLocaleDateString("en-GB")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
