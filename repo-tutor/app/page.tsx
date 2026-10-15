import HeroForm from "@/components/ui/HeroForm";
import RepoCard from "@/components/repository/RepoCard";
import { DEMO_REPOSITORIES } from "@/lib/demo/data";
import {
  BookOpenIcon,
  CodeIcon,
  ZapIcon,
  LayersIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeIcon,
} from "@/components/ui/Icons";

// Featured repos: only first 3
const FEATURED = DEMO_REPOSITORIES.slice(0, 3);

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Paste a Repository",
    desc: "Enter any public GitHub repository URL. Repo Tutor will build a structured learning path from it.",
    color: "var(--orange)",
    bg: "#FFF0EA",
  },
  {
    step: "02",
    title: "Follow Your Learning Path",
    desc: "Work through ordered lessons that guide you from project structure to core logic.",
    color: "var(--purple)",
    bg: "#F0EBFF",
  },
  {
    step: "03",
    title: "Understand Code & Test Knowledge",
    desc: "Explore source files with explanations and take quizzes to check your understanding.",
    color: "#16a34a",
    bg: "#EDFCF2",
  },
];

const FEATURES = [
  {
    icon: <LayersIcon size={22} />,
    title: "Guided Learning Path",
    desc: "Know which files to study first and why. Every repository becomes a structured curriculum.",
    color: "var(--orange)",
    bg: "#FFF0EA",
  },
  {
    icon: <CodeIcon size={22} />,
    title: "Understand the Code",
    desc: "Explore code with clear, beginner-friendly explanations. See what each file and function does.",
    color: "var(--purple)",
    bg: "#F0EBFF",
  },
  {
    icon: <CheckCircleIcon size={22} />,
    title: "Test Your Knowledge",
    desc: "Practice with quizzes and small coding exercises. Get instant feedback on every answer.",
    color: "#16a34a",
    bg: "#EDFCF2",
  },
  {
    icon: <GlobeIcon size={22} />,
    title: "Learn in Your Language",
    desc: "Choose English or Hinglish explanations. Learning is easier in the language you think in.",
    color: "#ca8a04",
    bg: "#FEFCE8",
  },
];

const TRUST = [
  { label: "Learn Step by Step" },
  { label: "Explore Real Code" },
  { label: "English + Hinglish" },
];

export default function HomePage() {
  return (
    <>
      {/* ─── Hero ───────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden"
        style={{ background: "var(--cream)" }}
      >
        {/* Subtle dot-grid decoration */}
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy + form */}
            <div className="space-y-8">
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest border-2"
                style={{
                  borderColor: "var(--orange)",
                  color: "var(--orange)",
                  background: "#FFF0EA",
                }}
              >
                <ZapIcon size={12} />
                YOUR OPEN-SOURCE LEARNING COMPANION
              </div>

              {/* Headline */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                Every Codebase
                <br />
                Has a{" "}
                <span style={{ color: "var(--orange)" }}>Story.</span>
                <br />
                Learn to Read It.
              </h1>

              <p className="text-lg leading-relaxed max-w-lg" style={{ color: "var(--ink-muted)" }}>
                Turn any GitHub repository into a guided learning journey. Understand the files,
                follow the logic, and learn by exploring real code.
              </p>

              {/* Trust labels */}
              <div className="flex flex-wrap gap-3">
                {TRUST.map((t) => (
                  <span
                    key={t.label}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border-2"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--ink-muted)",
                      background: "var(--white)",
                    }}
                  >
                    <CheckCircleIcon size={14} className="shrink-0" style={{ color: "var(--green)" } as React.CSSProperties} />
                    {t.label}
                  </span>
                ))}
              </div>

              {/* Form card */}
              <div
                className="p-6 rounded-2xl border-2 shadow-sm"
                style={{ background: "var(--white)", borderColor: "var(--border)" }}
              >
                <HeroForm />
              </div>
            </div>

            {/* Right: illustration */}
            <div className="hidden lg:flex items-center justify-center">
              <RepoIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured repos ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2
            className="text-3xl font-black tracking-tight mb-3"
            style={{ color: "var(--ink)" }}
          >
            Start With a Famous Repo
          </h2>
          <p style={{ color: "var(--ink-muted)" }}>
            Three curated starting points. All with full demo courses ready to go.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────── */}
      <section style={{ background: "var(--white)" }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2
              className="text-3xl font-black tracking-tight mb-3"
              style={{ color: "var(--ink)" }}
            >
              How It Works
            </h2>
            <p style={{ color: "var(--ink-muted)" }}>Three steps to understanding any codebase.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="flex flex-col items-start gap-4">
                <span
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.step}
                </span>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: "var(--ink)" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2
            className="text-3xl font-black tracking-tight mb-3"
            style={{ color: "var(--ink)" }}
          >
            Everything You Need to Learn
          </h2>
          <p style={{ color: "var(--ink-muted)" }}>
            One platform, one purpose: understand codebases, step by step.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border-2"
              style={{ background: "var(--white)", borderColor: "var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: f.bg, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold mb-2" style={{ color: "var(--ink)" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ background: "var(--ink)" }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Your Next Favorite Open-Source
            <br />
            Project Is Waiting.
          </h2>
          <p className="text-lg" style={{ color: "#a8a29e" }}>
            Paste a GitHub URL. Get a full learning path in seconds.
          </p>
          <a
            href="#hero"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-opacity hover:opacity-90"
            style={{ background: "var(--orange)" }}
          >
            Start Learning
            <ArrowRightIcon size={20} />
          </a>
        </div>
      </section>
    </>
  );
}

// ─── Repo Illustration ────────────────────────────────────────

function RepoIllustration() {
  return (
    <div className="relative w-80 h-80">
      {/* Main folder shape */}
      <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
        {/* Background circle */}
        <circle cx="160" cy="160" r="140" fill="#F0EBFF" />

        {/* Folder body */}
        <rect x="60" y="100" width="200" height="140" rx="12" fill="#7447EB" opacity="0.15" stroke="#7447EB" strokeWidth="2" />
        <rect x="60" y="90" width="80" height="20" rx="8" fill="#7447EB" opacity="0.25" stroke="#7447EB" strokeWidth="2" />

        {/* Code lines */}
        <rect x="80" y="130" width="80" height="8" rx="4" fill="#7447EB" opacity="0.5" />
        <rect x="80" y="148" width="120" height="8" rx="4" fill="#7447EB" opacity="0.3" />
        <rect x="80" y="166" width="60" height="8" rx="4" fill="#FF6B35" opacity="0.5" />
        <rect x="80" y="184" width="100" height="8" rx="4" fill="#7447EB" opacity="0.3" />
        <rect x="80" y="202" width="70" height="8" rx="4" fill="#7447EB" opacity="0.4" />

        {/* Bracket decorations */}
        <text x="240" y="120" fontSize="48" fill="#FF6B35" opacity="0.3" fontFamily="monospace" fontWeight="bold">{"{"}</text>
        <text x="30" y="200" fontSize="48" fill="#7447EB" opacity="0.3" fontFamily="monospace" fontWeight="bold">{"}"}</text>

        {/* Stars */}
        <circle cx="280" cy="80" r="6" fill="#FFD84D" />
        <circle cx="50" cy="70" r="4" fill="#B8E986" />
        <circle cx="290" cy="220" r="5" fill="#FF6B35" opacity="0.5" />

        {/* Connection dots */}
        <circle cx="160" cy="260" r="8" fill="#FF6B35" />
        <circle cx="130" cy="270" r="5" fill="#7447EB" opacity="0.5" />
        <circle cx="190" cy="270" r="5" fill="#B8E986" />
        <line x1="130" y1="270" x2="160" y2="260" stroke="#E8DDD0" strokeWidth="2" />
        <line x1="190" y1="270" x2="160" y2="260" stroke="#E8DDD0" strokeWidth="2" />
      </svg>
    </div>
  );
}
