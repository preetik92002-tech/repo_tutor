"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon, XIcon, CodeIcon } from "@/components/ui/Icons";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "var(--cream)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
            style={{ color: "var(--ink)" }}
          >
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold"
              style={{ background: "var(--orange)" }}
            >
              <CodeIcon size={16} />
            </span>
            <span>
              Repo<span style={{ color: "var(--orange)" }}>Tutor</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/explore"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--ink-muted)" }}
            >
              Explore
            </Link>
            <Link
              href="/progress"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--ink-muted)" }}
            >
              My Progress
            </Link>
            <Link
              href="/#hero"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--orange)" }}
            >
              Start Learning
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-3"
          style={{ borderColor: "var(--border)", background: "var(--cream)" }}
        >
          <Link
            href="/explore"
            className="block text-sm font-medium py-2"
            style={{ color: "var(--ink-muted)" }}
            onClick={() => setOpen(false)}
          >
            Explore
          </Link>
          <Link
            href="/progress"
            className="block text-sm font-medium py-2"
            style={{ color: "var(--ink-muted)" }}
            onClick={() => setOpen(false)}
          >
            My Progress
          </Link>
          <Link
            href="/#hero"
            className="block px-4 py-2 rounded-lg text-sm font-semibold text-white text-center"
            style={{ background: "var(--orange)" }}
            onClick={() => setOpen(false)}
          >
            Start Learning
          </Link>
        </div>
      )}
    </header>
  );
}
