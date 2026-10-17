import { Suspense } from "react";
import Link from "next/link";
import { getAllRepositories } from "@/lib/services";
import { loadRepoView } from "@/lib/server/repoView";
import { StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ClockIcon, ArrowRightIcon, CodeIcon, ExternalLinkIcon } from "@/components/ui/Icons";
import AnalyzeGate from "@/components/repository/AnalyzeGate";
import AskTutor from "@/components/repository/AskTutor";

export function generateStaticParams() {
  return getAllRepositories().map((repo) => ({ owner: repo.owner, name: repo.name }));
}

interface Props {
  params: Promise<{ owner: string; name: string }>;
  searchParams: Promise<{ start?: string }>;
}

export default function RepoPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<div className="container-page py-12 text-muted" role="status">Loading repository…</div>}>
      <RepoDashboard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RepoDashboard({ params, searchParams }: Props) {
  const { owner, name } = await params;
  const { start } = await searchParams;
  const view = await loadRepoView(owner, name);

  if (view.kind === "none") {
    return (
      <div className="container-page py-12">
        <AnalyzeGate owner={owner} name={name} autoStart={start === "1"} />
      </div>
    );
  }

  const live = view.kind === "live";
  const course = view.course;
  const info = live
    ? {
        owner: view.stored.analysis.repo.fullName.split("/")[0],
        name: view.stored.analysis.repo.name,
        description: view.stored.analysis.repo.description || course.description,
        language: view.stored.analysis.languages[0]?.name ?? view.stored.analysis.repo.language,
        topics: view.stored.analysis.repo.topics,
        githubUrl: view.stored.analysis.repo.htmlUrl,
      }
    : { owner: view.repo.owner, name: view.repo.name, description: view.repo.description, language: view.repo.language, topics: view.repo.topics, githubUrl: view.repo.githubUrl };

  const completedLessons = course.learningPath.filter((l) => l.status === "completed").length;
  const inProgressLesson = course.learningPath.find((l) => l.status === "in_progress");
  const lastLessonId = live ? view.progress?.lastLessonId : null;
  const resume = lastLessonId ? course.learningPath.find((l) => l.id === lastLessonId && l.status !== "completed") : undefined;
  const firstUnfinished = resume ?? inProgressLesson ?? course.learningPath.find((l) => l.status === "not_started") ?? course.learningPath[0];
  const totalMinutes = course.learningPath.reduce((acc, l) => acc + l.estimatedMinutes, 0);
  const remainingMinutes = course.learningPath.filter((l) => l.status !== "completed").reduce((acc, l) => acc + l.estimatedMinutes, 0);
  const pct = Math.round((completedLessons / course.totalLessons) * 100);

  return (
    <div className="container-page py-8 sm:py-12">
      {/* ─── Header Card ────────────────────────────────────── */}
      <header className="card card-pop p-5 sm:p-7 border-2 border-ink bg-white">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <span className="badge bg-fresh text-ink uppercase tracking-wide">Live analysis</span>
          ) : (
            <span className="badge bg-sun text-ink uppercase tracking-wide">Demo data</span>
          )}
          <span className="badge bg-white text-ink">{info.language}</span>
          {info.topics.slice(0, 3).map((t) => (
            <span key={t} className="badge bg-white text-muted">
              {t}
            </span>
          ))}
        </div>

        <h1 className="mt-3 break-words text-3xl sm:text-4xl text-ink">
          {info.owner}
          <span className="text-muted">/</span>
          <span className="text-purple">{info.name}</span>
        </h1>

        <p className="mt-2 max-w-2xl text-muted text-base leading-relaxed">{info.description}</p>

        {live ? (
          <p className="mt-2 text-xs text-muted">
            Read {view.stored.analysis.stats.analyzedFiles} of {view.stored.analysis.stats.repoFiles} repository files at commit{" "}
            <span className="font-mono">{view.stored.row.commitSha?.slice(0, 7)}</span>. The lessons are built from those files with fixed rules, not written by an AI model.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Demo mode: this course is bundled sample content. Repo Tutor has not analysed the live repository.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {firstUnfinished && (
            <Link href={`/repo/${owner}/${name}/lesson/${firstUnfinished.id}`} className="btn btn-primary btn-lg">
              <span>{completedLessons > 0 || resume ? "Continue Learning" : "Start Course"}</span>
              <ArrowRightIcon size={18} />
            </Link>
          )}

          <Link href={`/repo/${owner}/${name}/code`} className="btn btn-secondary btn-lg">
            <CodeIcon size={18} />
            <span>Explore code</span>
          </Link>

          <a
            href={info.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-6 gap-1.5 text-sm font-bold underline underline-offset-4 hover:text-purple ml-2"
          >
            <span>View on GitHub</span>
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </header>

      {/* ─── Learning Overview ──────────────────────────────── */}
      <section aria-label="Learning overview" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 sm:col-span-2 lg:col-span-2 border-2 border-ink">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Progress</p>
          <p className="mt-1 font-display text-4xl font-black text-ink">{pct}%</p>
          <div className="mt-3">
            <ProgressBar value={pct} height={14} />
          </div>
        </div>

        <div className="card bg-purple-soft p-5 border-2 border-ink">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Lessons completed</p>
          <p className="mt-1 font-display text-4xl font-black text-ink">
            {completedLessons}
            <span className="text-2xl text-muted"> / {course.totalLessons}</span>
          </p>
        </div>

        <div className="card bg-sun/60 p-5 border-2 border-ink">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Time left</p>
          <p className="mt-1 font-display text-4xl font-black text-ink">
            {remainingMinutes || totalMinutes}
            <span className="text-2xl font-bold"> min</span>
          </p>
        </div>
      </section>

      {/* ─── Learning Path & Objectives Layout ──────────────── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="path">
          <h2 id="path" className="text-2xl sm:text-3xl text-ink">
            Learning path
          </h2>

          <ol className="mt-5 space-y-3">
            {course.learningPath.map((lesson) => {
              const isCurrent =
                lesson.status === "in_progress" ||
                (lesson.id === firstUnfinished?.id && lesson.status === "not_started" && completedLessons === 0);

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/repo/${owner}/${name}/lesson/${lesson.id}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-pop ${
                      isCurrent ? "border-[3px] bg-purple-soft shadow-pop" : "border-2 bg-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border-2 border-ink font-display text-lg font-black bg-white text-ink"
                    >
                      {lesson.lessonNumber}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold text-ink">{lesson.title}</span>
                        {isCurrent && <span className="badge bg-orange text-ink">Up next</span>}
                      </span>

                      <span className="mt-0.5 block text-sm text-muted">{lesson.objective}</span>

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

        <aside aria-labelledby="objectives" className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="card bg-sun/40 p-5 border-2 border-ink">
            <h2 id="objectives" className="flex items-center gap-2 text-xl font-black text-ink">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              What you will learn
            </h2>

            <ul className="mt-4 space-y-3">
              {course.objectives.slice(0, 3).map((obj, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink leading-relaxed">
                  <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-white text-xs font-black">
                    {i + 1}
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {live && (
            <div className="card bg-white p-5 border-2 border-ink">
              <h2 className="text-base font-black text-ink">What this analysis could not verify</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {view.stored.analysis.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {live && (
        <div className="mt-8">
          <AskTutor owner={owner} name={name} />
        </div>
      )}
    </div>
  );
}
