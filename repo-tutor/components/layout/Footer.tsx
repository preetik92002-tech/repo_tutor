import Link from "next/link";
import { BrandLogo } from "./Navbar";
import { GithubIcon } from "@/components/ui/Icons";

export default function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-ink bg-white">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <Link href="/" aria-label="Repo Tutor home">
            <BrandLogo />
          </Link>
          <p className="mt-2 text-sm text-muted">
            Turn a GitHub repository into a step-by-step learning path.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm sm:items-end">
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="inline-flex items-center min-h-6 font-bold underline decoration-orange decoration-2 underline-offset-4 hover:text-purple transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/progress"
              className="inline-flex items-center min-h-6 font-bold underline decoration-orange decoration-2 underline-offset-4 hover:text-purple transition-colors"
            >
              My Progress
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-6 gap-1 font-bold underline decoration-orange decoration-2 underline-offset-4 hover:text-purple transition-colors"
              aria-label="GitHub repository"
            >
              <GithubIcon size={15} />
              GitHub
            </a>
          </div>
          <p className="text-muted text-xs">
            © 2026 Repo Tutor. Demo frontend.
          </p>
        </div>
      </div>
    </footer>
  );
}
