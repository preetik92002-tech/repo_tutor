import { notFound } from "next/navigation";
import { getDemoRepository, getFileTree, getAllRepositories } from "@/lib/services";
import CodeExplorer from "@/components/code-explorer/CodeExplorer";

export function generateStaticParams() {
  const repos = getAllRepositories();
  return repos.map((repo) => ({
    owner: repo.owner,
    name: repo.name,
  }));
}

interface CodePageProps {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

export default async function CodePage({ params }: CodePageProps) {
  const { owner, name } = await params;

  const repo = getDemoRepository(owner, name);
  if (!repo) return notFound();

  const tree = getFileTree(owner, name);

  return <CodeExplorer repo={repo} tree={tree} />;
}
