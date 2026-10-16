"use client";

import { useState } from "react";
import Link from "next/link";
import type { Course, Lesson, Quiz, LanguagePreference } from "@/lib/types";
import {
  markLessonComplete,
  saveLessonQuizResult,
  getLessonStatus,
} from "@/lib/services";
import CodeBlock from "@/components/code-explorer/CodeBlock";
import QuizPanel from "@/components/quiz/QuizPanel";
import { StatusBadge } from "@/components/ui/Badge";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  MenuIcon,
  XIcon,
  PlayCircleIcon,
  CircleIcon,
  BookOpenIcon,
  ZapIcon,
} from "@/components/ui/Icons";

interface LessonViewerProps {
  course: Course;
  lesson: Lesson;
  quiz: Quiz | null;
  owner: string;
  name: string;
}

export default function LessonViewer({
  course,
  lesson,
  quiz,
  owner,
  name,
}: LessonViewerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(() => {
    if (typeof window === "undefined") return lesson.status === "completed";
    return getLessonStatus(owner, name, lesson.id, lesson.status) === "completed";
  });
  const [lang, setLang] = useState<LanguagePreference>("english");

  // Handle Mark as Complete toggle
  function handleToggleComplete() {
    markLessonComplete(owner, name, lesson.id, course.description);
    setIsCompleted(true);
  }

  // Handle Quiz completion
  function handleQuizComplete(score: number, total: number) {
    saveLessonQuizResult(lesson.id, score, total);
    // Passing quiz automatically completes lesson
    if (score >= Math.ceil(total / 2)) {
      markLessonComplete(owner, name, lesson.id, course.description);
      setIsCompleted(true);
    }
  }

  // Find previous and next lessons
  const currentIndex = course.learningPath.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? course.learningPath[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < course.learningPath.length - 1
      ? course.learningPath[currentIndex + 1]
      : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)" }}>
      {/* ─── Top Bar / Breadcrumb ──────────────────────── */}
      <div
        className="border-b px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-16 z-30"
        style={{ background: "var(--white)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 text-xs sm:text-sm overflow-hidden whitespace-nowrap">
          <Link
            href="/"
            className="hover:opacity-70 transition-opacity font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            Home
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link
            href={`/repo/${owner}/${name}`}
            className="hover:opacity-70 transition-opacity font-medium truncate max-w-[140px] sm:max-w-none"
            style={{ color: "var(--ink-muted)" }}
          >
            {owner}/{name}
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="font-bold truncate" style={{ color: "var(--ink)" }}>
            Lesson {lesson.lessonNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div
            className="flex items-center rounded-xl p-1 border"
            style={{ background: "var(--cream)", borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setLang("english")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                lang === "english" ? "text-white shadow-sm" : ""
              }`}
              style={{
                background: lang === "english" ? "var(--purple)" : "transparent",
                color: lang === "english" ? "#fff" : "var(--ink-muted)",
              }}
            >
              English
            </button>
            <button
              onClick={() => setLang("hinglish")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                lang === "hinglish" ? "text-white shadow-sm" : ""
              }`}
              style={{
                background: lang === "hinglish" ? "var(--orange)" : "transparent",
                color: lang === "hinglish" ? "#fff" : "var(--ink-muted)",
              }}
            >
              Hinglish
            </button>
          </div>

          {/* Mobile Table of Contents button */}
          <button
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="lg:hidden p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold"
            style={{ borderColor: "var(--border)", background: "var(--cream)" }}
            aria-label="Toggle lessons navigation"
          >
            <MenuIcon size={16} />
            <span>Lessons</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Layout ────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Left Sidebar (Desktop) */}
        <aside
          className="hidden lg:block w-72 shrink-0 self-start sticky top-32 rounded-2xl border-2 p-4 bg-white"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: "var(--ink-muted)" }}>
              Course Syllabus
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--cream)", color: "var(--orange)" }}>
              {course.learningPath.length} Lessons
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {course.learningPath.map((item) => {
              const isCurrent = item.id === lesson.id;
              const status = getLessonStatus(owner, name, item.id, item.status);
              const Icon =
                status === "completed"
                  ? CheckCircleIcon
                  : isCurrent
                  ? PlayCircleIcon
                  : CircleIcon;
              const iconColor =
                status === "completed"
                  ? "var(--green)"
                  : isCurrent
                  ? "var(--orange)"
                  : "var(--border)";

              return (
                <Link
                  key={item.id}
                  href={`/repo/${owner}/${name}/lesson/${item.id}`}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl text-sm transition-all ${
                    isCurrent
                      ? "font-bold shadow-sm"
                      : "hover:bg-black/5 opacity-80 hover:opacity-100"
                  }`}
                  style={{
                    background: isCurrent ? "var(--cream)" : "transparent",
                    color: isCurrent ? "var(--ink)" : "var(--ink-muted)",
                    border: isCurrent ? "1.5px solid var(--orange)" : "1.5px solid transparent",
                  }}
                >
                  <Icon
                    size={16}
                    className="shrink-0 mt-0.5"
                    style={{ color: iconColor } as React.CSSProperties}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold leading-tight line-clamp-1">
                      {item.lessonNumber}. {item.title}
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      {item.estimatedMinutes} min
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <Link
              href={`/repo/${owner}/${name}/code`}
              className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl border hover:border-purple-400 transition-all"
              style={{ background: "var(--cream)", borderColor: "var(--border)", color: "var(--purple)" }}
            >
              <span>Explore Source Code</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </aside>

        {/* Mobile Sidebar Modal */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className="relative w-80 max-w-full h-full p-6 flex flex-col z-10 shadow-2xl"
              style={{ background: "var(--white)" }}
            >
              <div className="flex items-center justify-between pb-4 border-b mb-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-bold text-base" style={{ color: "var(--ink)" }}>
                  Lessons in Course
                </h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/5"
                  aria-label="Close menu"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {course.learningPath.map((item) => {
                  const isCurrent = item.id === lesson.id;
                  const status = getLessonStatus(owner, name, item.id, item.status);
                  return (
                    <Link
                      key={item.id}
                      href={`/repo/${owner}/${name}/lesson/${item.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block p-3 rounded-xl border-2 text-sm transition-all ${
                        isCurrent ? "font-bold" : "hover:border-black/20"
                      }`}
                      style={{
                        background: isCurrent ? "var(--cream)" : "var(--white)",
                        borderColor: isCurrent ? "var(--orange)" : "var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: "var(--orange)" }}>
                          Lesson {item.lessonNumber}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <div className="font-bold mt-1 text-sm leading-snug">{item.title}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Center / Main Lesson Content */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Header Card */}
          <div
            className="p-6 sm:p-8 rounded-3xl border-2 bg-white"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-black tracking-wide"
                  style={{ background: "#FFF0EA", color: "var(--orange)" }}
                >
                  LESSON {lesson.lessonNumber} OF {course.learningPath.length}
                </span>
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
                >
                  <ClockIcon size={12} />
                  {lesson.estimatedMinutes} mins
                </span>
              </div>
              <StatusBadge status={isCompleted ? "completed" : "in_progress"} />
            </div>

            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-3"
              style={{ color: "var(--ink)" }}
            >
              {lesson.title}
            </h1>

            <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              {lesson.objective}
            </p>

            <div className="mt-6 pt-6 border-t flex flex-wrap items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                Repository: <strong style={{ color: "var(--ink)" }}>{course.title}</strong>
              </div>
              <button
                onClick={handleToggleComplete}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
                  isCompleted
                    ? "border-2 hover:opacity-80"
                    : "text-white hover:opacity-90"
                }`}
                style={
                  isCompleted
                    ? {
                        background: "#EDFCF2",
                        borderColor: "#16a34a",
                        color: "#15803d",
                      }
                    : {
                        background: "var(--green)",
                        color: "var(--ink)",
                      }
                }
              >
                <CheckCircleIcon size={16} />
                {isCompleted ? "Completed ✓" : "Mark as Complete"}
              </button>
            </div>
          </div>

          {/* Lesson Sections */}
          <div className="space-y-6">
            {lesson.sections.map((section, idx) => {
              switch (section.type) {
                case "explanation":
                  return (
                    <section
                      key={idx}
                      className="p-6 sm:p-8 rounded-3xl border-2 bg-white space-y-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider" style={{ color: "var(--purple)" }}>
                        <BookOpenIcon size={16} />
                        <span>Core Concept & Explanation</span>
                      </div>
                      <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--ink)" }}>
                        {lang === "hinglish" && section.hinglishContent
                          ? section.hinglishContent
                          : section.content}
                      </p>
                    </section>
                  );

                case "objectives":
                  return (
                    <section
                      key={idx}
                      className="p-6 sm:p-8 rounded-3xl border-2 bg-white"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>
                        {section.content}
                      </h3>
                      <ul className="space-y-2.5">
                        {((lang === "hinglish" && section.hinglishItems) || section.items || []).map(
                          (item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm sm:text-base leading-relaxed"
                              style={{ color: "var(--ink-muted)" }}
                            >
                              <CheckCircleIcon
                                size={18}
                                className="shrink-0 mt-0.5"
                                style={{ color: "var(--green)" } as React.CSSProperties}
                              />
                              <span>{item}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </section>
                  );

                case "code":
                  return (
                    <section
                      key={idx}
                      className="p-6 sm:p-8 rounded-3xl border-2 bg-white space-y-4"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div>
                        <h3 className="font-bold text-lg mb-1" style={{ color: "var(--ink)" }}>
                          Code In Action
                        </h3>
                        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                          {section.content}
                        </p>
                      </div>
                      {section.codeSnippet && <CodeBlock snippet={section.codeSnippet} />}
                    </section>
                  );

                case "breakdown":
                  return (
                    <section
                      key={idx}
                      className="p-6 sm:p-8 rounded-3xl border-2 bg-white"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <h3 className="font-bold text-lg mb-4" style={{ color: "var(--ink)" }}>
                        {section.content}
                      </h3>
                      <div className="space-y-3">
                        {(section.items || []).map((item, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl border flex items-start gap-3 text-sm leading-relaxed"
                            style={{ background: "var(--cream)", borderColor: "var(--border)" }}
                          >
                            <span
                              className="w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0"
                              style={{ background: "var(--purple)", color: "#fff" }}
                            >
                              {i + 1}
                            </span>
                            <span style={{ color: "var(--ink)" }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );

                case "takeaways":
                  return (
                    <section
                      key={idx}
                      className="p-6 sm:p-8 rounded-3xl border-2"
                      style={{ background: "#F5F3FF", borderColor: "#DDD6FE" }}
                    >
                      <div className="flex items-center gap-2 mb-4 font-bold text-lg" style={{ color: "var(--purple)" }}>
                        <ZapIcon size={20} />
                        <h3>{section.content}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {(section.items || []).map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm sm:text-base leading-relaxed"
                            style={{ color: "#3B0764" }}
                          >
                            <span className="font-bold shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );

                case "exercise":
                  return (
                    <section
                      key={idx}
                      className="p-6 sm:p-8 rounded-3xl border-2"
                      style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
                    >
                      <div className="flex items-center gap-2 mb-3 font-black text-xs uppercase tracking-widest" style={{ color: "#B45309" }}>
                        <span>⚡ Hands-on Exercise</span>
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed font-medium" style={{ color: "#78350F" }}>
                        {section.content}
                      </p>
                    </section>
                  );

                default:
                  return null;
              }
            })}
          </div>

          {/* Quiz Section */}
          {quiz && (
            <section className="pt-4">
              <QuizPanel quiz={quiz} onComplete={handleQuizComplete} />
            </section>
          )}

          {/* Bottom Navigation */}
          <div
            className="p-6 rounded-2xl border-2 bg-white flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderColor: "var(--border)" }}
          >
            {prevLesson ? (
              <Link
                href={`/repo/${owner}/${name}/lesson/${prevLesson.id}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 font-bold text-sm transition-all hover:bg-black/5"
                style={{ borderColor: "var(--border)", color: "var(--ink)" }}
              >
                <ArrowLeftIcon size={16} />
                <span>Prev: Lesson {prevLesson.lessonNumber}</span>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}

            <button
              onClick={handleToggleComplete}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                isCompleted
                  ? "border-2"
                  : "text-white shadow-sm hover:opacity-90"
              }`}
              style={
                isCompleted
                  ? { background: "#EDFCF2", borderColor: "#16a34a", color: "#15803d" }
                  : { background: "var(--green)", color: "var(--ink)" }
              }
            >
              {isCompleted ? "✓ Lesson Completed" : "Mark as Complete"}
            </button>

            {nextLesson ? (
              <Link
                href={`/repo/${owner}/${name}/lesson/${nextLesson.id}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 shadow-sm"
                style={{ background: "var(--orange)" }}
              >
                <span>Next: Lesson {nextLesson.lessonNumber}</span>
                <ArrowRightIcon size={16} />
              </Link>
            ) : (
              <Link
                href={`/repo/${owner}/${name}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 shadow-sm"
                style={{ background: "var(--purple)" }}
              >
                <span>Course Overview</span>
                <ArrowRightIcon size={16} />
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
