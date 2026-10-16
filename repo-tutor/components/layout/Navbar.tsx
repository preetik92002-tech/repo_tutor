"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "@/components/ui/Icons";

export function BrandLogo() {
  return (
    <span className="group inline-flex items-center gap-2">
      <svg
        aria-hidden="true"
        viewBox="0 0 36 36"
        width="34"
        height="34"
        className="transition-transform group-hover:-rotate-6"
      >
        <rect x="3" y="14" width="30" height="19" rx="4" fill="#FF6B35" stroke="#202020" strokeWidth="2.5" />
        <rect x="7" y="6" width="8" height="8" rx="2" fill="#FF6B35" stroke="#202020" strokeWidth="2.5" />
        <rect x="21" y="6" width="8" height="8" rx="2" fill="#FF6B35" stroke="#202020" strokeWidth="2.5" />
        <path
          d="M14 20l-4 4 4 4M22 20l4 4-4 4"
          fill="none"
          stroke="#202020"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display text-xl font-black tracking-tight text-ink">
        Repo Tutor
      </span>
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isExplore = pathname === "/explore";
  const isProgress = pathname === "/progress";

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream">
      <div className="container-page flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Repo Tutor home">
          <BrandLogo />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          <Link
            href="/explore"
            className={`text-sm font-bold underline-offset-8 hover:underline hover:decoration-orange hover:decoration-4 ${
              isExplore ? "underline decoration-orange decoration-4" : ""
            }`}
          >
            Explore
          </Link>
          <Link
            href="/progress"
            className={`text-sm font-bold underline-offset-8 hover:underline hover:decoration-orange hover:decoration-4 ${
              isProgress ? "underline decoration-orange decoration-4" : ""
            }`}
          >
            My Progress
          </Link>
          <Link href="/#hero" className="btn btn-primary">
            Start Learning
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="btn btn-secondary px-3 py-2 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div
          className="border-b-2 border-ink bg-cream px-4 py-4 space-y-3 md:hidden"
        >
          <Link
            href="/explore"
            className={`block text-sm font-bold py-2 ${
              isExplore ? "text-purple underline decoration-orange decoration-2" : "text-ink"
            }`}
            onClick={() => setOpen(false)}
          >
            Explore
          </Link>
          <Link
            href="/progress"
            className={`block text-sm font-bold py-2 ${
              isProgress ? "text-purple underline decoration-orange decoration-2" : "text-ink"
            }`}
            onClick={() => setOpen(false)}
          >
            My Progress
          </Link>
          <Link
            href="/#hero"
            className="btn btn-primary w-full text-center"
            onClick={() => setOpen(false)}
          >
            Start Learning
          </Link>
        </div>
      )}
    </header>
  );
}
