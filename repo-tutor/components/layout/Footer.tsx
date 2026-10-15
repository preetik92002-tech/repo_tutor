import Link from "next/link";
import { GithubIcon, CodeIcon } from "@/components/ui/Icons";

export default function Footer() {
  return (
    <footer
      className="border-t mt-16"
      style={{ borderColor: "var(--border)", background: "var(--cream)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-lg">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-md text-white"
                style={{ background: "var(--orange)" }}
              >
                <CodeIcon size={14} />
              </span>
              <span style={{ color: "var(--ink)" }}>
                Repo<span style={{ color: "var(--orange)" }}>Tutor</span>
              </span>
            </div>
            <p className="text-sm max-w-xs" style={{ color: "var(--ink-muted)" }}>
              Understand any codebase. Learn it step by step.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-6 text-sm" style={{ color: "var(--ink-muted)" }}>
            <Link href="/explore" className="hover:opacity-70 transition-opacity">
              Explore
            </Link>
            <Link href="/progress" className="hover:opacity-70 transition-opacity">
              My Progress
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              aria-label="View project on GitHub (placeholder)"
            >
              <GithubIcon size={16} />
              GitHub
            </a>
          </nav>
        </div>

        <div
          className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
        >
          <p>© {new Date().getFullYear()} RepoTutor. Built for learners exploring open source.</p>
          <p className="text-xs">
            ⚠️ Demo mode — using sample data, no real GitHub requests
          </p>
        </div>
      </div>
    </footer>
  );
}
