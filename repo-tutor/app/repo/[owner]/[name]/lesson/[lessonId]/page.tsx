import { notFound } from "next/navigation";
import { getCourse, getLesson, getQuiz, getAllRepositories } from "@/lib/services";
import LessonViewer from "@/components/course/LessonViewer";

export function generateStaticParams() {
  const repos = getAllRepositories();
  const staticParams: { owner: string; name: string; lessonId: string }[] = [];
  for (const repo of repos) {
    const course = getCourse(repo.owner, repo.name);
    if (course) {
      for (const item of course.learningPath) {
        staticParams.push({
          owner: repo.owner,
          name: repo.name,
          lessonId: item.id,
        });
      }
    }
  }
  return staticParams;
}

interface LessonPageProps {
  params: Promise<{
    owner: string;
    name: string;
    lessonId: string;
  }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { owner, name, lessonId } = await params;

  const course = getCourse(owner, name);
  if (!course) return notFound();

  const lesson = getLesson(lessonId);
  if (!lesson) return notFound();

  const quiz = getQuiz(lessonId);

  return (
    <LessonViewer
      course={course}
      lesson={lesson}
      quiz={quiz}
      owner={owner}
      name={name}
    />
  );
}
