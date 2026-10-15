import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemoRepository, getCourse, getRepoProgress } from "@/lib/services";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  GithubIcon,
  BookOpenIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  CircleIcon,
  ExternalLinkIcon,
} from "@/components/ui/Icons";
import type { LearningPathItem } from "@/lib/types";

interface Props {
  params: Promise<{ owner: string; name: string }>;
}

export default async function RepoDashboard({ params }: Props) {
  const { owner, name } = await params;
  const repo = getDemoRepository(owner, name);
  if (!repo) return notFound();

  const course = getCourse(owner, name);
  if (!course) return notFound();

  // Compute progress from demo defaults (server side — no localStorage)
  const completedLessons = course.learningPath.filter((l) => l.status === "completed").length;
  const inProgressLesson = course.learningPath.find((l) => l.status === "in_progress");
  const firstUnfinished = inProgressLesson ?? course.learningPath.find((l) => l.status === "not_started");
  const pct = Math.round((completedLessons / course.totalLessons) * 100);

  return (
    <div style={{ background: "var(--cream)" }} className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ─── Repo Header ─────────────────────────────── */}
        <div
          className="p-6 rounded-2xl border-2 mb-8"
          style={{ background: "var(--white)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              {/* Demo indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="yellow">Demo Course</Badge>
                {repo.topics.slice(0, 3).map((t) => (
                  <Badge key={t} variant="muted">{t}</Badge>
                ))}
              </div>
              <h1
                className="text-3xl font-black tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                {repo.fullName}
              </h1>
              <p style={{ color: "var(--ink-muted)" }}>{repo.description}</p>
              <a
                href={repo.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "var(--purple)" }}
              >
                <GithubIcon size={15} />
                {repo.githubUrl}
                <ExternalLinkIcon size={12} />
              </a>
            </div>
            {firstUnfinished && (
              <Link
                href={`/repo/${owner}/${name}/lesson/${firstUnfinished.id}`}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: "var(--orange)" }}
              >
                Continue Learning
                <ArrowRightIcon size={16} />
              </Link>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ─── Left column ───────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Learning path */}
            <section>
              <h2
                className="text-xl font-black mb-4"
                style={{ color: "var(--ink)" }}
              >
                Learning Path
              </h2>
              <div className="space-y-3">
                {course.learningPath.map((lesson, i) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    owner={owner}
                    name={name}
                    isLast={i === course.learningPath.length - 1}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* ─── Right sidebar ──────────────────────────── */}
          <div className="space-y-6">
            {/* Progress card */}
            <div
              className="p-5 rounded-2xl border-2"
              style={{ background: "var(--white)", borderColor: "var(--border)" }}
            >
              <h3 className="font-bold mb-4" style={{ color: "var(--ink)" }}>
                Your Progress
              </h3>
              <ProgressBar value={pct} label={`${completedLessons} of ${course.totalLessons} lessons`} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatBox label="Completed" value={String(completedLessons)} color="var(--green)" />
                <StatBox label="Remaining" value={String(course.totalLessons - completedLessons)} color="var(--orange)" />
                <StatBox label="Est. Hours" value={`~${course.estimatedHours}h`} color="var(--purple)" />
                <StatBox label="Level" value={course.skillLevel} color="var(--yellow)" />
              </div>
            </div>

            {/* Objectives */}
            <div
              className="p-5 rounded-2xl border-2"
              style={{ background: "var(--white)", borderColor: "var(--border)" }}
            >
              <h3 className="font-bold mb-3" style={{ color: "var(--ink)" }}>
                Learning Objectives
              </h3>
              <ul className="space-y-2">
                {course.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                    <CheckCircleIcon size={15} className="mt-0.5 shrink-0" style={{ color: "var(--green)" } as React.CSSProperties} />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>

            {/* Code explorer link */}
            <Link
              href={`/repo/${owner}/${name}/code`}
              className="flex items-center justify-between p-5 rounded-2xl border-2 hover:border-purple-400 transition-all group"
              style={{ background: "var(--white)", borderColor: "var(--border)" }}
            >
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--ink)" }}>
                  Explore the Code
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  Browse files and read explanations
                </p>
              </div>
              <ArrowRightIcon size={18} style={{ color: "var(--purple)" } as React.CSSProperties} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lesson row ───────────────────────────────────────────────

function LessonRow({
  lesson,
  owner,
  name,
  isLast,
}: {
  lesson: LearningPathItem;
  owner: string;
  name: string;
  isLast: boolean;
}) {
  const isClickable = lesson.status !== "not_started" || true; // all clickable in demo

  const StatusIcon =
    lesson.status === "completed"
      ? CheckCircleIcon
      : lesson.status === "in_progress"
      ? PlayCircleIcon
      : CircleIcon;

  const iconColor =
    lesson.status === "completed"
      ? "var(--green)"
      : lesson.status === "in_progress"
      ? "var(--orange)"
      : "var(--border)";

  const borderColor =
    lesson.status === "in_progress" ? "var(--orange)" : "var(--border)";

  return (
    <Link
      href={`/repo/${owner}/${name}/lesson/${lesson.id}`}
      className="flex items-start gap-4 p-4 rounded-xl border-2 hover:shadow-sm transition-all group"
      style={{
        background: lesson.status === "in_progress" ? "#FFF8EC" : "var(--white)",
        borderColor,
      }}
    >
      <StatusIcon
        size={22}
        style={{ color: iconColor, marginTop: 2 } as React.CSSProperties}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: "var(--ink-muted)" }}>
            Lesson {lesson.lessonNumber}
          </span>
          <StatusBadge status={lesson.status} />
        </div>
        <h4 className="font-bold mt-0.5" style={{ color: "var(--ink)" }}>
          {lesson.title}
        </h4>
        <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
          {lesson.objective}
        </p>
        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          <ClockIcon size={12} />
          {lesson.estimatedMinutes} min
        </div>
      </div>
      <ArrowRightIcon
        size={16}
        className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--orange)" } as React.CSSProperties}
      />
    </Link>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{ background: "var(--cream)" }}
    >
      <div className="text-lg font-black" style={{ color }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
        {label}
      </div>
    </div>
  );
}
