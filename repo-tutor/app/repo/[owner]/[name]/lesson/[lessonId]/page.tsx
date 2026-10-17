import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCourse, getLesson, getQuiz, getAllRepositories } from "@/lib/services";
import { toPublicQuiz } from "@/lib/db/store";
import { loadRepoView } from "@/lib/server/repoView";
import LessonViewer from "@/components/course/LessonViewer";
import AnalyzeGate from "@/components/repository/AnalyzeGate";

export function generateStaticParams() {
  const staticParams: { owner: string; name: string; lessonId: string }[] = [];
  for (const repo of getAllRepositories()) {
    const course = getCourse(repo.owner, repo.name);
    if (course) {
      for (const item of course.learningPath) {
        staticParams.push({ owner: repo.owner, name: repo.name, lessonId: item.id });
      }
    }
  }
  return staticParams;
}

interface LessonPageProps {
  params: Promise<{ owner: string; name: string; lessonId: string }>;
}

export default function LessonPage({ params }: LessonPageProps) {
  return (
    <Suspense fallback={<div className="container-page py-12 text-muted" role="status">Loading lesson…</div>}>
      <LessonContent params={params} />
    </Suspense>
  );
}

async function LessonContent({ params }: LessonPageProps) {
  const { owner, name, lessonId } = await params;
  const view = await loadRepoView(owner, name);

  if (view.kind === "none") {
    return (
      <div className="container-page py-12">
        <AnalyzeGate owner={owner} name={name} />
      </div>
    );
  }

  if (view.kind === "live") {
    const lesson = view.stored.lessons.find((l) => l.id === lessonId);
    if (!lesson) return notFound();
    const quiz = view.stored.quizzes.find((q) => q.lessonId === lessonId);
    return (
      <LessonViewer
        mode="live"
        course={view.course}
        lesson={{ ...lesson, status: view.completedIds.includes(lesson.id) ? "completed" : "not_started" }}
        quiz={quiz ? toPublicQuiz(quiz) : null}
        owner={owner}
        name={name}
        completedIds={view.completedIds}
      />
    );
  }

  const lesson = getLesson(lessonId);
  if (!lesson || !view.course.learningPath.some((l) => l.id === lessonId)) return notFound();
  return <LessonViewer course={view.course} lesson={lesson} quiz={getQuiz(lessonId)} owner={owner} name={name} />;
}
