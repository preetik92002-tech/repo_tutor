"use client";

import { useState } from "react";
import Link from "next/link";
import { getGlobalProgress, saveGlobalProgress } from "@/lib/services";
import type { GlobalProgress } from "@/lib/types";
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
  const [progress, setProgress] = useState<GlobalProgress>(() => {
    if (typeof window === "undefined") {
      return { repos: [], totalLessonsCompleted: 0, totalQuizzesTaken: 0 };
    }
    const current = getGlobalProgress();
    if (current.repos.length === 0) {
      const demoInit: GlobalProgress = {
        totalLessonsCompleted: 3,
        totalQuizzesTaken: 2,
        repos: [
          {
            repoId: "facebook-react",
            repoFullName: "facebook/react",
            repoDescription:
              "The library for web and native user interfaces. Build UI from pieces called components.",
            completedLessons: 2,
            totalLessons: 6,
            percentComplete: 33,
            lastAccessedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            lessonProgress: [
              {
                lessonId: "react-l1",
                status: "completed",
                completedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
                quizResult: {
                  lessonId: "react-l1",
                  answers: [],
                  score: 3,
                  total: 3,
                  completedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
                },
              },
              {
                lessonId: "react-l2",
                status: "completed",
                completedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                quizResult: {
                  lessonId: "react-l2",
                  answers: [],
                  score: 2,
                  total: 3,
                  completedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                },
              },
              {
                lessonId: "react-l3",
                status: "in_progress",
              },
            ],
          },
          {
            repoId: "expressjs-express",
            repoFullName: "expressjs/express",
            repoDescription: "Fast, unopinionated, minimalist web framework for Node.js.",
            completedLessons: 1,
            totalLessons: 5,
            percentComplete: 20,
            lastAccessedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            lessonProgress: [
              {
                lessonId: "express-l1",
                status: "completed",
                completedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
              },
            ],
          },
        ],
      };
      saveGlobalProgress(demoInit);
      return demoInit;
    }
    return current;
  });

  function handleResetProgress() {
    const empty: GlobalProgress = {
      repos: [],
      totalLessonsCompleted: 0,
      totalQuizzesTaken: 0,
    };
    saveGlobalProgress(empty);
    setProgress(empty);
  }

  function handleRestoreDemoProgress() {
    const sample: GlobalProgress = {
      totalLessonsCompleted: 3,
      totalQuizzesTaken: 2,
      repos: [
        {
          repoId: "facebook-react",
          repoFullName: "facebook/react",
          repoDescription:
            "The library for web and native user interfaces. Build UI from pieces called components.",
          completedLessons: 2,
          totalLessons: 6,
          percentComplete: 33,
          lastAccessedAt: new Date().toISOString(),
          lessonProgress: [
            {
              lessonId: "react-l1",
              status: "completed",
              completedAt: new Date().toISOString(),
              quizResult: {
                lessonId: "react-l1",
                answers: [],
                score: 3,
                total: 3,
                completedAt: new Date().toISOString(),
              },
            },
            {
              lessonId: "react-l2",
              status: "completed",
              completedAt: new Date().toISOString(),
              quizResult: {
                lessonId: "react-l2",
                answers: [],
                score: 2,
                total: 3,
                completedAt: new Date().toISOString(),
              },
            },
          ],
        },
      ],
    };
    saveGlobalProgress(sample);
    setProgress(sample);
  }

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--ink-muted)" }}>
          Loading your learning stats...
        </p>
      </div>
    );
  }

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
            color="var(--orange)"
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
          <EmptyProgress onRestoreSample={handleRestoreDemoProgress} />
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
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 shadow-sm"
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
                                  ? "var(--orange)"
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

function EmptyProgress({ onRestoreSample }: { onRestoreSample: () => void }) {
  return (
    <div
      className="p-12 sm:p-16 rounded-3xl border-2 bg-white text-center space-y-5"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-5xl">🚀</div>
      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="text-xl font-black" style={{ color: "var(--ink)" }}>
          No Active Courses Yet
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          You haven&apos;t started learning any repositories yet. Pick a repository from our curated collection to begin your guided open-source learning journey.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/explore"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 shadow-sm"
          style={{ background: "var(--orange)" }}
        >
          <span>Start Learning</span>
          <ArrowRightIcon size={16} />
        </Link>
        <button
          onClick={onRestoreSample}
          className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-xs border hover:bg-black/5 transition-all"
          style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
        >
          Load Demo Progress
        </button>
      </div>
    </div>
  );
}
