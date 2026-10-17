import { expect, type Page } from "@playwright/test";
import { analyzeRepository } from "../lib/analysis/analyze";
import { buildCourse } from "../lib/analysis/course";
import { fixtureIngestion } from "../tests/analysis/fixture";

// The answer key is derived here from the same deterministic builder the server uses,
// so tests never read the server's database or ship answers to the browser.
const files = [...fixtureIngestion.files].sort((a, b) => a.path.localeCompare(b.path)); // the server sorts by path too
export const built = buildCourse(analyzeRepository({ ...fixtureIngestion, files }), files);

export function quizFor(lessonId: string) {
  const quiz = built.quizzes.find((q) => q.lessonId === lessonId);
  if (!quiz) throw new Error(`no quiz for ${lessonId}`);
  return quiz.questions.map((q) => ({
    question: q.question,
    correct: q.options.find((o) => o.id === q.correctOptionId)!.text,
    wrong: q.options.find((o) => o.id !== q.correctOptionId)!.text,
  }));
}

/** Answer every question on the page and press Submit. */
export async function takeQuiz(page: Page, lessonId: string, mode: "correct" | "wrong") {
  for (const q of quizFor(lessonId)) {
    const fs = page.locator("fieldset", { hasText: q.question });
    await fs.getByRole("radio", { name: mode === "correct" ? q.correct : q.wrong, exact: true }).check();
  }
  await page.getByRole("button", { name: "Submit answers" }).click();
}

/** Analyse a fixture repository through the real API and wait until it is stored. */
export async function ensureAnalyzed(page: Page, repo = "acme/shop") {
  const r = await page.request.post("/api/analyze", { data: { url: `https://github.com/${repo}` } });
  expect([200, 202]).toContain(r.status());
  const { id } = await r.json();
  await expect
    .poll(async () => (await (await page.request.get(`/api/analyze/${id}`)).json()).status, { timeout: 30_000 })
    .toBe("completed");
}

export const SHOP_LESSONS = built.lessons.length;

/** App alerts only: excludes Next.js'es hidden route announcer, which also has role="alert". */
export const alertOf = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
