import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/Icons";

export default function RepoNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🗂️</div>
        <h1 className="text-3xl font-black" style={{ color: "var(--ink)" }}>
          Repository Not Found
        </h1>
        <p style={{ color: "var(--ink-muted)" }}>
          This repository isn&apos;t in our demo collection yet. Try one of the featured repositories
          or explore what&apos;s available.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/explore"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--orange)" }}
          >
            Explore Repos
            <ArrowRightIcon size={16} />
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold border-2 transition-all hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
