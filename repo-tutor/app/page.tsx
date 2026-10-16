import HeroForm from "@/components/ui/HeroForm";
import RepoCard from "@/components/repository/RepoCard";
import { DEMO_REPOSITORIES } from "@/lib/demo/data";
import { StarIcon } from "@/components/ui/Icons";
import Image from "next/image";

// Featured repos: exactly first 3
const FEATURED = DEMO_REPOSITORIES.slice(0, 3);

export default function HomePage() {
  return (
    <>
      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2 border-ink">
        <div className="container-page grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          {/* Left Hero Content */}
          <div>
            <p className="eyebrow">YOUR OPEN-SOURCE LEARNING COMPANION</p>

            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl text-ink">
              Every Codebase Has a Story.{" "}
              <span className="relative inline-block whitespace-nowrap sm:whitespace-normal">
                <span className="relative z-10">Learn to Read It.</span>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 z-0 h-3 w-full bg-sun sm:h-4"
                />
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-muted leading-relaxed">
              Turn any GitHub repository into a guided learning journey. Understand the files,
              follow the logic, and learn by exploring real code.
            </p>

            {/* Form */}
            <div className="mt-7 max-w-xl">
              <HeroForm />
            </div>

            {/* Trust Badges */}
            <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Highlights">
              <li className="badge py-1 text-sm bg-sun">
                <StarIcon size={14} className="text-ink" />
                Learn Step by Step
              </li>
              <li className="badge py-1 text-sm bg-fresh">
                <StarIcon size={14} className="text-ink" />
                Explore Real Code
              </li>
              <li className="badge py-1 text-sm bg-purple-soft">
                <StarIcon size={14} className="text-purple" />
                English + Hinglish
              </li>
            </ul>
          </div>

          {/* Right Hero Illustration with Mascot & Code Pathway */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <svg
              viewBox="0 0 480 440"
              role="img"
              aria-label="Repo Tutor Mascot beside a repository folder and connected learning path"
              className="h-auto w-full"
            >
              {/* Sunshine orbit backdrop */}
              <circle cx="240" cy="226" r="178" fill="#FFD84D" stroke="#202020" strokeWidth="3.5" strokeLinejoin="round" />
              <circle
                cx="240"
                cy="226"
                r="178"
                fill="none"
                stroke="#202020"
                strokeWidth="3.5"
                strokeDasharray="2 12"
                strokeLinecap="round"
                transform="rotate(12 240 226) scale(1.07) translate(-17 -16)"
                opacity="0.35"
              />

              {/* Big Coding Brackets */}
              <text
                x="22"
                y="120"
                fontFamily="var(--font-display)"
                fontWeight="900"
                fontSize="96"
                fill="#7447EB"
                stroke="#202020"
                strokeWidth="2.5"
                paintOrder="stroke"
              >
                {"{"}
              </text>
              <text
                x="408"
                y="120"
                fontFamily="var(--font-display)"
                fontWeight="900"
                fontSize="96"
                fill="#7447EB"
                stroke="#202020"
                strokeWidth="2.5"
                paintOrder="stroke"
              >
                {"}"}
              </text>

              {/* Connected Learning Path curve */}
              <path
                d="M60 312 C 50 292, 90 274, 110 262 C 180 236, 300 250, 372 286"
                fill="none"
                stroke="#202020"
                strokeWidth="4"
                strokeDasharray="3 10"
                strokeLinecap="round"
              />

              {/* Path Node 1 */}
              <g>
                <circle cx="60" cy="310" r="17" fill="#B8E986" stroke="#202020" strokeWidth="3.5" strokeLinejoin="round" />
                <text x="60" y="316" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="18" fill="#202020">
                  1
                </text>
              </g>

              {/* Path Node 2 */}
              <g>
                <circle cx="110" cy="262" r="17" fill="#FF6B35" stroke="#202020" strokeWidth="3.5" strokeLinejoin="round" />
                <text x="110" y="268" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="18" fill="#202020">
                  2
                </text>
              </g>

              {/* Path Node 3 */}
              <g>
                <circle cx="372" cy="286" r="17" fill="#7447EB" stroke="#202020" strokeWidth="3.5" strokeLinejoin="round" />
                <text x="372" y="292" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="18" fill="#fff">
                  3
                </text>
              </g>

              {/* Repository folder sticker */}
              <g transform="translate(22 330)">
                <path
                  d="M0 14 Q0 0 14 0 H58 L72 16 H150 Q164 16 164 30 V86 Q164 100 150 100 H14 Q0 100 0 86 Z"
                  fill="#FFFFFF"
                  stroke="#202020"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <rect x="0" y="30" width="164" height="70" rx="12" fill="#B8E986" stroke="#202020" strokeWidth="3.5" strokeLinejoin="round" />
                <text x="82" y="74" textAnchor="middle" fontFamily="ui-monospace, Menlo, Consolas, monospace" fontWeight="800" fontSize="18" fill="#202020">
                  owner/repo
                </text>
              </g>

              {/* Code blocks motif */}
              <g transform="translate(318 310)" stroke="#202020" strokeWidth="3.5" strokeLinejoin="round">
                <rect x="0" y="62" width="130" height="44" rx="6" fill="#7447EB" />
                <rect x="14" y="30" width="102" height="34" rx="6" fill="#FF6B35" />
                <rect x="30" y="2" width="70" height="30" rx="6" fill="#FFD84D" />
                <rect x="16" y="52" width="24" height="12" rx="3" fill="#7447EB" />
                <rect x="50" y="52" width="24" height="12" rx="3" fill="#7447EB" />
                <rect x="84" y="52" width="24" height="12" rx="3" fill="#7447EB" />
                <rect x="28" y="20" width="22" height="12" rx="3" fill="#FF6B35" />
                <rect x="72" y="20" width="22" height="12" rx="3" fill="#FF6B35" />
              </g>

              {/* Floating stars */}
              <path transform="translate(72 190) scale(1)" d="M0 -12 2.6 -2.6 12 0 2.6 2.6 0 12 -2.6 2.6 -12 0 -2.6 -2.6Z" fill="#FF6B35" stroke="#202020" strokeWidth="1.7" strokeLinejoin="round" />
              <path transform="translate(408 196) scale(1.25)" d="M0 -12 2.6 -2.6 12 0 2.6 2.6 0 12 -2.6 2.6 -12 0 -2.6 -2.6Z" fill="#B8E986" stroke="#202020" strokeWidth="1.7" strokeLinejoin="round" />
              <path transform="translate(342 64) scale(0.83)" d="M0 -12 2.6 -2.6 12 0 2.6 2.6 0 12 -2.6 2.6 -12 0 -2.6 -2.6Z" fill="#FFFFFF" stroke="#202020" strokeWidth="1.7" strokeLinejoin="round" />
              <path transform="translate(120 56) scale(0.75)" d="M0 -12 2.6 -2.6 12 0 2.6 2.6 0 12 -2.6 2.6 -12 0 -2.6 -2.6Z" fill="#FFFFFF" stroke="#202020" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>

            {/* Mascot Image Centerpiece */}
            <div className="absolute left-1/2 top-[9%] w-[42%] -translate-x-1/2 pointer-events-none drop-shadow-md">
              <Image
                src="/mascot.png"
                alt="Repo Tutor Mascot"
                width={200}
                height={200}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Repositories ──────────────────────────── */}
      <section className="container-page py-14" aria-labelledby="featured">
        <p className="eyebrow">Demo repositories</p>
        <h2 id="featured" className="mt-2 text-3xl sm:text-4xl text-ink">
          Start with a ready-made course
        </h2>
        <p className="mt-2 max-w-2xl text-muted">
          These three courses are bundled sample content, so you can try the full experience today.
        </p>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {FEATURED.map((r) => (
            <RepoCard key={r.id} repo={r} actionLabel="Explore Course" />
          ))}
        </div>
      </section>

      {/* ─── How It Works (Exactly 3 steps) ─────────────────── */}
      <section className="border-y-2 border-ink bg-white py-14" aria-labelledby="how">
        <div className="container-page">
          <h2 id="how" className="text-3xl sm:text-4xl text-ink">
            How it works
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            <li className="card card-pop flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border-2 border-ink font-display text-2xl font-black bg-fresh text-ink"
              >
                1
              </span>
              <div>
                <h3 className="text-lg text-ink font-black">Paste a repository</h3>
                <p className="mt-1 text-sm text-muted">
                  Drop in a public GitHub URL and choose your language and level.
                </p>
              </div>
            </li>
            <li className="card card-pop flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border-2 border-ink font-display text-2xl font-black bg-orange text-ink"
              >
                2
              </span>
              <div>
                <h3 className="text-lg text-ink font-black">Follow your learning path</h3>
                <p className="mt-1 text-sm text-muted">
                  Work through ordered lessons that tell you what to read first and why.
                </p>
              </div>
            </li>
            <li className="card card-pop flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border-2 border-ink font-display text-2xl font-black bg-purple text-white"
              >
                3
              </span>
              <div>
                <h3 className="text-lg text-ink font-black">
                  Understand code and test your knowledge
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Read explained source, then check yourself with a short quiz.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ─── Features Section (Exactly 4 features) ──────────── */}
      <section className="container-page py-14" aria-labelledby="features">
        <h2 id="features" className="text-3xl sm:text-4xl text-ink">
          Built for learning, not skimming
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1 */}
          <article className="card p-5 bg-sun border-2 border-ink">
            <span className="grid h-11 w-11 place-items-center rounded-[10px] border-2 border-ink bg-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
              </svg>
            </span>
            <h3 className="mt-4 text-lg font-black text-ink">Guided Learning Path</h3>
            <p className="mt-1 text-sm text-ink/80 font-medium">
              Know which files to study first and why.
            </p>
          </article>

          {/* Feature 2 */}
          <article className="card p-5 bg-purple-soft border-2 border-ink">
            <span className="grid h-11 w-11 place-items-center rounded-[10px] border-2 border-ink bg-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink"
                aria-hidden="true"
              >
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </span>
            <h3 className="mt-4 text-lg font-black text-ink">Understand the Code</h3>
            <p className="mt-1 text-sm text-ink/80 font-medium">
              Explore code with clear, beginner-friendly explanations.
            </p>
          </article>

          {/* Feature 3 */}
          <article className="card p-5 bg-fresh border-2 border-ink">
            <span className="grid h-11 w-11 place-items-center rounded-[10px] border-2 border-ink bg-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink"
                aria-hidden="true"
              >
                <path d="M13 5h8" />
                <path d="M13 12h8" />
                <path d="M13 19h8" />
                <path d="m3 17 2 2 4-4" />
                <path d="m3 7 2 2 4-4" />
              </svg>
            </span>
            <h3 className="mt-4 text-lg font-black text-ink">Test Your Knowledge</h3>
            <p className="mt-1 text-sm text-ink/80 font-medium">
              Practice with quizzes and small coding exercises.
            </p>
          </article>

          {/* Feature 4 */}
          <article className="card p-5 bg-white border-2 border-ink">
            <span className="grid h-11 w-11 place-items-center rounded-[10px] border-2 border-ink bg-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink"
                aria-hidden="true"
              >
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
            </span>
            <h3 className="mt-4 text-lg font-black text-ink">Learn in Your Language</h3>
            <p className="mt-1 text-sm text-ink/80 font-medium">
              Choose English or Hinglish explanations.
            </p>
          </article>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────── */}
      <section className="container-page pb-10">
        <div className="card card-pop relative overflow-hidden bg-purple px-6 py-12 text-center text-white sm:px-12 border-2 border-ink">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 text-sun"
            aria-hidden="true"
          >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
          </svg>
          <h2 className="mx-auto max-w-2xl text-3xl sm:text-4xl font-black text-white">
            Your Next Favorite Open-Source Project Is Waiting.
          </h2>
          <div className="mt-7">
            <a className="btn btn-primary btn-lg" href="/#start">
              Start Learning
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
