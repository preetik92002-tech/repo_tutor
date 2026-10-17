import { cookies } from "next/headers";
import { getDb } from "../db";
import { getRepoProgress, loadLatest, type RepoProgressDetail, type StoredAnalysis } from "../db/store";
import { getCourse, getDemoRepository } from "../services";
import type { Course, Repository } from "../types";
import { LEARNER_COOKIE, readLearnerId } from "./learner";

// What a repository page should show. A real analysis always wins over bundled demo data,
// and "none" is an explicit state, never silently filled with demo content.

export type RepoView =
  | { kind: "live"; slug: string; stored: StoredAnalysis; course: Course; progress: RepoProgressDetail | null; completedIds: string[] }
  | { kind: "demo"; repo: Repository; course: Course }
  | { kind: "none"; owner: string; name: string };

export async function currentLearnerId(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(LEARNER_COOKIE)?.value;
  return v ? readLearnerId(`${LEARNER_COOKIE}=${v}`) : null;
}

export async function loadRepoView(owner: string, name: string): Promise<RepoView> {
  const slug = `${owner}/${name}`.toLowerCase();
  const db = getDb();
  const stored = loadLatest(db, slug);
  if (stored) {
    const learner = await currentLearnerId();
    const progress = learner ? getRepoProgress(db, learner, slug) : null;
    const statusById = new Map((progress?.lessonProgress ?? []).map((l) => [l.lessonId, l.status]));
    const course: Course = {
      ...stored.course,
      learningPath: stored.course.learningPath.map((l) => ({ ...l, status: statusById.get(l.id) ?? "not_started" })),
    };
    const completedIds = (progress?.lessonProgress ?? []).filter((l) => l.status === "completed").map((l) => l.lessonId);
    return { kind: "live", slug, stored, course, progress, completedIds };
  }
  const demo = getDemoRepository(owner, name);
  const demoCourse = demo ? getCourse(owner, name) : null;
  if (demo && demoCourse) return { kind: "demo", repo: demo, course: demoCourse };
  return { kind: "none", owner, name };
}
