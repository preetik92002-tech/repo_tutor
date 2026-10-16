import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemoRepository, getCourse, getAllRepositories } from "@/lib/services";
import { StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  ClockIcon,
  ArrowRightIcon,
  CodeIcon,
  ExternalLinkIcon,
} from "@/components/ui/Icons";
import type { LearningPathItem } from "@/lib/types";

export function generateStaticParams() {
  const repos = getAllRepositories();
  return repos.map((repo) => ({
    owner: repo.owner,
    name: repo.name,
  }));
}

interface Props {
  params: Promise<{ owner: string; name: string }>;
}

export default async function RepoDashboard({ params }: Props) {
  const { owner, name } = await params;
  const repo = getDemoRepository(owner, name);
  if (!repo) return notFound();

  const course = getCourse(owner, name);
  if (!course) return notFound();

  // Progress metrics
  const completedLessons = course.learningPath.filter((l) => l.status === "completed").length;
  const inProgressLesson = course.learningPath.find((l) => l.status === "in_progress");
  const firstUnfinished = inProgressLesson ?? course.learningPath.find((l) => l.status === "not_started") ?? course.learningPath[0];
  const totalMinutes = course.learningPath.reduce((acc, l) => acc + l.estimatedMinutes, 0);
  const remainingMinutes = course.learningPath
    .filter((l) => l.status !== "completed")
    .reduce((acc, l) => acc + l.estimatedMinutes, 0);
  const pct = Math.round((completedLessons / course.totalLessons) * 100);

  return (
    <div className="container-page py-8 sm:py-12">
      {/* ─── Header Card ────────────────────────────────────── */}
      <header className="card card-pop p-5 sm:p-7 border-2 border-ink bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-sun text-ink uppercase tracking-wide">Demo data</span>
          <span className="badge bg-white text-ink">{repo.language}</span>
          {repo.topics.slice(0, 3).map((t) => (
            <span key={t} className="badge bg-white text-muted">
              {t}
            </span>
          ))}
        </div>

        <h1 className="mt-3 break-words text-3xl sm:text-4xl text-ink">
          {repo.owner}
          <span className="text-muted">/</span>
          <span className="text-purple">{repo.name}</span>
        </h1>

        <p className="mt-2 max-w-2xl text-muted text-base leading-relaxed">
          {repo.description}
        </p>

        <p className="mt-2 text-xs text-muted">
          Demo mode: this course is bundled sample content. Repo Tutor has not analysed the live repository.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {firstUnfinished && (
            <Link
              href={`/repo/${owner}/${name}/lesson/${firstUnfinished.id}`}
              className="btn btn-primary btn-lg"
            >
              <span>{completedLessons > 0 ? "Continue Learning" : "Start Course"}</span>
              <ArrowRightIcon size={18} />
            </Link>
          )}

          <Link
            href={`/repo/${owner}/${name}/code`}
            className="btn btn-secondary btn-lg"
          >
            <CodeIcon size={18} />
            <span>Explore code</span>
          </Link>

          <a
            href={repo.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4 hover:text-purple ml-2"
          >
            <span>View on GitHub</span>
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </header>

      {/* ─── Learning Overview ──────────────────────────────── */}
      <section aria-label="Learning overview" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Progress % */}
        <div className="card p-5 sm:col-span-2 lg:col-span-2 border-2 border-ink">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Progress</p>
          <p className="mt-1 font-display text-4xl font-black text-ink">{pct}%</p>
          <div className="mt-3">
            <ProgressBar value={pct} height={14} />
          </div>
        </div>

        {/* Lessons Completed */}
        <div className="card bg-purple-soft p-5 border-2 border-ink">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">
            Lessons completed
          </p>
          <p className="mt-1 font-display text-4xl font-black text-ink">
            {completedLessons}
            <span className="text-2xl text-muted"> / {course.totalLessons}</span>
          </p>
        </div>

        {/* Estimated Time Left */}
        <div className="card bg-sun/60 p-5 border-2 border-ink">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">
            Time left
          </p>
          <p className="mt-1 font-display text-4xl font-black text-ink">
            {remainingMinutes || totalMinutes}
            <span className="text-2xl font-bold"> min</span>
          </p>
        </div>
      </section>

      {/* ─── Learning Path & Objectives Layout ──────────────── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Left: Syllabus timeline */}
        <section aria-labelledby="path">
          <h2 id="path" className="text-2xl sm:text-3xl text-ink">
            Learning path
          </h2>

          <ol className="mt-5 space-y-3">
            {course.learningPath.map((lesson) => {
              const isCurrent = lesson.status === "in_progress" || (lesson.id === firstUnfinished?.id && lesson.status === "not_started" && completedLessons === 0);

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/repo/${owner}/${name}/lesson/${lesson.id}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-pop ${
                      isCurrent
                        ? "border-[3px] bg-purple-soft shadow-pop"
                        : "border-2 bg-white"
                    }`}
                  >
                    {/* Number block */}
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border-2 border-ink font-display text-lg font-black bg-white text-ink"
                    >
                      {lesson.lessonNumber}
                    </span>

                    {/* Lesson description */}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold text-ink">
                          {lesson.title}
                        </span>
                        {isCurrent && (
                          <span className="badge bg-orange text-ink">
                            Up next
                          </span>
                        )}
                      </span>

                      <span className="mt-0.5 block text-sm text-muted">
                        {lesson.objective}
                      </span>

                      <span className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
                        <span className="inline-flex items-center gap-1 text-muted">
                          <ClockIcon size={14} />
                          {lesson.estimatedMinutes} min
                        </span>
                        <StatusBadge status={lesson.status} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Right: Learning Objectives */}
        <aside aria-labelledby="objectives" className="h-fit lg:sticky lg:top-24">
          <div className="card bg-sun/40 p-5 border-2 border-ink">
            <h2 id="objectives" className="flex items-center gap-2 text-xl font-black text-ink">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
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
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              What you will learn
            </h2>

            <ul className="mt-4 space-y-3">
              {course.objectives.slice(0, 3).map((obj, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-white text-xs font-black shrink-0"
                  >
                    {i + 1}
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
