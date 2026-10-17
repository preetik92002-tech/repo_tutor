import { Suspense } from "react";
import { getFileTree, getAllRepositories } from "@/lib/services";
import { loadRepoView } from "@/lib/server/repoView";
import { buildTree, explainFile } from "@/lib/analysis/explain";
import CodeExplorer from "@/components/code-explorer/CodeExplorer";
import AnalyzeGate from "@/components/repository/AnalyzeGate";
import type { FileExplanation, Repository } from "@/lib/types";

export function generateStaticParams() {
  return getAllRepositories().map((repo) => ({ owner: repo.owner, name: repo.name }));
}

interface CodePageProps {
  params: Promise<{ owner: string; name: string }>;
}

export default function CodePage({ params }: CodePageProps) {
  return (
    <Suspense fallback={<div className="container-page py-12 text-muted" role="status">Loading code…</div>}>
      <CodeContent params={params} />
    </Suspense>
  );
}

async function CodeContent({ params }: CodePageProps) {
  const { owner, name } = await params;
  const view = await loadRepoView(owner, name);

  if (view.kind === "none") {
    return (
      <div className="container-page py-12">
        <AnalyzeGate owner={owner} name={name} />
      </div>
    );
  }

  if (view.kind === "demo") {
    return <CodeExplorer repo={view.repo} tree={getFileTree(owner, name)} />;
  }

  const a = view.stored.analysis;
  const repo: Repository = {
    id: view.course.repoId,
    owner,
    name,
    fullName: a.repo.fullName,
    description: a.repo.description,
    stars: a.repo.stars,
    language: a.languages[0]?.name ?? a.repo.language,
    topics: a.repo.topics,
    category: "fullstack",
    githubUrl: a.repo.htmlUrl,
    isDemo: false,
  };
  const explanations: Record<string, FileExplanation> = {};
  for (const f of a.files) explanations[f.path] = explainFile(a, f.path);

  return (
    <CodeExplorer
      repo={repo}
      tree={buildTree(a.files.map((f) => f.path))}
      live={{ explanations, initialPath: a.readingOrder[0]?.path ?? a.files[0]?.path }}
    />
  );
}
