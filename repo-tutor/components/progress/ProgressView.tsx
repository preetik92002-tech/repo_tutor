"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getGlobalProgress, saveGlobalProgress } from "@/lib/services";
import type { GlobalProgress } from "@/lib/types";
import { api } from "@/lib/client/api";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpenIcon,
  CheckCircleIcon,
  TrophyIcon,
  ArrowRightIcon,
  RefreshCcwIcon,
  ZapIcon,
} from "@/components/ui/Icons";

export default function ProgressView() {
  // Real progress lives on the server (keyed to an anonymous cookie). Sample-course progress from the
  // bundled demo is kept in this browser only and is shown separately. Nothing is pre-filled.
  const [server, setServer] = useState<GlobalProgress | null>(null);
  const [local, setLocal] = useState<GlobalProgress>({ repos: [], totalLessonsCompleted: 0, totalQuizzesTaken: 0 });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setServer(await api<GlobalProgress>("/api/progress"));
    } catch (e) {
      setServer(null);
      setError(e instanceof Error ? e.message : "Could not load your progress.");
    }
    setLocal(getGlobalProgress());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side load
    void load();
  }, [load]);

  async function handleResetProgress() {
    if (!window.confirm("Reset all saved progress? This cannot be undone.")) return;
    try {
      await api("/api/progress", { method: "DELETE" });
      saveGlobalProgress({ repos: [], totalLessonsCompleted: 0, totalQuizzesTaken: 0 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset progress.");
    }
  }

  if (error && !server) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center" style={{ background: "var(--cream)" }}>
        <p role="alert" className="text-sm font-semibold text-[#991b1b]">{error}</p>
        <button onClick={() => void load()} className="btn btn-secondary">Try again</button>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <p className="text-sm font-semibold" role="status" style={{ color: "var(--ink-muted)" }}>
          Loading your learning stats...
        </p>
      </div>
    );
  }

  const serverNames = new Set(server.repos.map((r) => r.repoFullName.toLowerCase()));
  const sampleRepos = local.repos.filter((r) => !serverNames.has(r.repoFullName.toLowerCase()));
  const sampleIds = new Set(sampleRepos.map((r) => r.repoId));
  const progress: GlobalProgress = {
    repos: [...server.repos, ...sampleRepos],
    totalLessonsCompleted: server.totalLessonsCompleted + sampleRepos.reduce((n, r) => n + r.completedLessons, 0),
    totalQuizzesTaken: server.totalQuizzesTaken + sampleRepos.flatMap((r) => r.lessonProgress).filter((l) => l.quizResult).length,
  };

  const hasRepos = progress.repos.length > 0;

  // Extract all completed quizzes
  const allQuizzes = progress.repos.flatMap((r) =>
    r.lessonProgress
      .filter((lp) => lp.quizResult)
      .map((lp) => ({
        repoName: r.repoFullName,
        lessonId: lp.lessonId,
        score: lp.quizResult!.score,
        total: lp.quizResult!.total,
        date: lp.quizResult!.completedAt,
      }))
  );

  return (
    <div className="min-h-screen py-12" style={{ background: "var(--cream)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* ─── Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-2 border"
              style={{
                borderColor: "var(--purple)",
                color: "var(--purple)",
                background: "#F0EBFF",
              }}
            >
              <ZapIcon size={12} />
              YOUR LEARNING JOURNEY
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
              Learning Progress
            </h1>
            <p className="text-sm sm:text-base mt-1" style={{ color: "var(--ink-muted)" }}>
              Track your course completion, finished lessons, and quiz scores across repositories.
            </p>
          </div>

          {hasRepos && (
            <button
              onClick={handleResetProgress}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border hover:bg-black/5 transition-all"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              <RefreshCcwIcon size={12} />
              Reset Progress
            </button>
          )}
        </div>

        {/* ─── Stats Overview ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Lessons Completed"
            value={String(progress.totalLessonsCompleted)}
            icon={<CheckCircleIcon size={20} />}
            color="var(--green)"
          />
          <StatCard
            label="Quizzes Taken"
            value={String(progress.totalQuizzesTaken || allQuizzes.length)}
            icon={<TrophyIcon size={20} />}
            color="var(--purple)"
          />
          <StatCard
            label="Active Repositories"
            value={String(progress.repos.length)}
            icon={<BookOpenIcon size={20} />}
            color="var(--orange-text)"
          />
          <StatCard
            label="Average Score"
            value={
              allQuizzes.length > 0
                ? `${Math.round(
                    (allQuizzes.reduce((acc, q) => acc + q.score / q.total, 0) /
                      allQuizzes.length) *
                      100
                  )}%`
                : "—"
            }
            icon={<ZapIcon size={20} />}
            color="#ca8a04"
          />
        </div>

        {/* ─── Repositories In Progress ───────────────────── */}
        {!hasRepos ? (
          <EmptyProgress />
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
              Recent Repositories
            </h2>

            <div className="space-y-4">
              {progress.repos.map((repo) => {
                const [owner, name] = repo.repoFullName.split("/");
                return (
                  <div
                    key={repo.repoId}
                    className="p-6 rounded-3xl border-2 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-black" style={{ color: "var(--ink)" }}>
                          {repo.repoFullName}
                        </h3>
                        <Badge variant={repo.percentComplete === 100 ? "green" : "orange"}>
                          {repo.percentComplete === 100 ? "Completed" : "In Progress"}
                        </Badge>
                        {sampleIds.has(repo.repoId) && <Badge variant="orange">Sample course · this browser only</Badge>}
                      </div>

                      <p className="text-sm line-clamp-2" style={{ color: "var(--ink-muted)" }}>
                        {repo.repoDescription}
                      </p>

                      <div className="max-w-md">
                        <ProgressBar
                          value={repo.percentComplete}
                          label={`${repo.completedLessons} of ${repo.totalLessons} lessons completed`}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      <Link
                        href={`/repo/${owner}/${name}`}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-ink transition-opacity hover:opacity-90 shadow-sm"
                        style={{ background: "var(--orange)" }}
                      >
                        <span>Continue Learning</span>
                        <ArrowRightIcon size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Quiz Results Breakdown ────────────────── */}
            {allQuizzes.length > 0 && (
              <div className="pt-6 space-y-4">
                <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
                  Recent Quiz Results
                </h2>

                <div
                  className="rounded-3xl border-2 bg-white overflow-hidden"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {allQuizzes.map((quiz, i) => (
                      <div
                        key={i}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="space-y-1">
                          <div className="font-bold" style={{ color: "var(--ink)" }}>
                            {quiz.repoName} — {quiz.lessonId}
                          </div>
                          <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                            Completed on {new Date(quiz.date).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className="px-3 py-1 rounded-xl font-mono font-bold text-sm"
                            style={{
                              background:
                                quiz.score === quiz.total
                                  ? "#EDFCF2"
                                  : quiz.score >= quiz.total / 2
                                  ? "#FFF0EA"
                                  : "#FEF2F2",
                              color:
                                quiz.score === quiz.total
                                  ? "#15803d"
                                  : quiz.score >= quiz.total / 2
                                  ? "var(--orange-text)"
                                  : "#b91c1c",
                            }}
                          >
                            {quiz.score} / {quiz.total}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: "var(--ink-muted)" }}>
                            {Math.round((quiz.score / quiz.total) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="p-5 rounded-2xl border-2 bg-white flex flex-col justify-between gap-2"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: "var(--ink-muted)" }}>
          {label}
        </span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-black" style={{ color: "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

function EmptyProgress() {
  return (
    <div
      className="p-12 sm:p-16 rounded-3xl border-2 bg-white text-center space-y-5"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-5xl" aria-hidden="true">🚀</div>
      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="text-xl font-black" style={{ color: "var(--ink)" }}>
          No Active Courses Yet
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          You haven&apos;t started learning any repositories yet. Paste a public GitHub repository on the home page to get a learning path built from its real files, or open one of the sample courses.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/#start"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-ink text-sm transition-opacity hover:opacity-90 shadow-sm"
          style={{ background: "var(--orange)" }}
        >
          <span>Analyse a repository</span>
          <ArrowRightIcon size={16} />
        </Link>
        <Link
          href="/explore"
          className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-xs border hover:bg-black/5 transition-all text-center"
          style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
        >
          Browse sample courses
        </Link>
      </div>
    </div>
  );
}
