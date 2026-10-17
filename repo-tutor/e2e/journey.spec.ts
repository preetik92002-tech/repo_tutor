import { test, expect } from "@playwright/test";
import { SHOP_LESSONS, takeQuiz, alertOf } from "./helpers";

// The main real-data journey, in a real browser:
// URL -> ingestion -> analysis -> dashboard -> lesson (EN/Hinglish) -> quiz -> Code Explorer -> progress -> refresh.
test.describe.configure({ mode: "serial" });

test("submit a repository and complete the full learning journey", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("textbox", { name: "GitHub repository" }).fill("https://github.com/acme/shop");
  await page.getByRole("button", { name: "Teach Me This Repo" }).click();

  // Analysis runs for real (against the fake GitHub) and lands on the live dashboard.
  await expect(page).toHaveURL(/\/repo\/acme\/shop/);
  await expect(page.getByText("Live analysis")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("acme");
  await expect(page.getByText(/Read 7 of 7 repository files/)).toBeVisible();
  await expect(page.getByText("e2e0123")).toBeVisible(); // pinned commit
  await expect(page.getByText(/not written by an AI model/)).toBeVisible();
  await expect(page.getByText("Demo mode")).toHaveCount(0);
  await expect(page.getByText(`0 / ${SHOP_LESSONS}`)).toBeVisible();

  // Lesson
  await page.getByRole("link", { name: /Start Course/ }).click();
  await expect(page).toHaveURL(/lesson\/overview/);
  await expect(page.getByRole("heading", { level: 1, name: "What is shop?" })).toBeVisible();
  await expect(page.getByText(/Shop is a small REST API/)).toBeVisible(); // real README text
  await expect(page.locator("pre").first()).toContainText('"name": "shop"'); // real package.json excerpt

  // English / Hinglish switch (and it is remembered)
  await page.getByRole("button", { name: "Hinglish" }).click();
  await expect(page.getByText("Is analysis ne jo verify nahi kiya:")).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByText("What this analysis could not verify:")).toBeVisible();

  // Completion is refused until the quiz is passed
  await page.getByRole("button", { name: "Mark as Complete" }).first().click();
  await expect(alertOf(page)).toContainText("Pass the quiz");

  // Wrong answers -> graded on the server, not passed
  await takeQuiz(page, "overview", "wrong");
  await expect(page.getByText(/Score: 0 \/ 3/)).toBeVisible();
  await expect(page.getByText(/Not passed yet/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Completed/ })).toHaveCount(0);

  // Retry with correct answers -> passes, explanations shown, lesson completes
  await page.getByRole("button", { name: "Try Again" }).click();
  await takeQuiz(page, "overview", "correct");
  await expect(page.getByText(/Score: 3 \/ 3/)).toBeVisible();
  await expect(page.getByText(/Passed\. Your attempt was saved/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Completed ✓" }).first()).toBeVisible();

  // Refresh: still completed (server-side)
  await page.reload();
  await expect(page.getByRole("button", { name: "Completed ✓" }).first()).toBeVisible();

  // Next lesson: opening it must not complete it
  await page.getByRole("link", { name: /Next: Lesson 2/ }).click();
  await expect(page).toHaveURL(/lesson\/layout/);
  await expect(page.getByRole("button", { name: "Mark as Complete" }).first()).toBeVisible();

  // Code Explorer on real files
  await page.goto("/repo/acme/shop/code");
  await expect(page.getByText("Analysed files")).toBeVisible();
  await expect(page.locator("pre").first()).toContainText("Shop is a small REST API"); // README first in reading order
  await page.getByRole("button", { name: "db.ts" }).click();
  await expect(page.locator("pre").first()).toContainText("export function listProducts()");
  await page.getByRole("button", { name: /listProducts/ }).first().click(); // jump to declaration via the explanation panel
  await expect(page.locator("pre div.bg-sun\\/40")).toContainText("listProducts");
  await page.getByPlaceholder("Filter files...").fill("routes");
  await expect(page.getByRole("button", { name: "routes.ts", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "db.ts" })).toHaveCount(0);

  // Progress page shows real, saved progress
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "acme/shop" })).toBeVisible();
  await expect(page.getByText(`1 of ${SHOP_LESSONS} lessons completed`)).toBeVisible();
  await expect(page.getByText("facebook/react")).toHaveCount(0); // no seeded fake progress
  const quizzesCard = page.getByText("Quizzes Taken", { exact: true }).locator("xpath=../..");
  await expect(quizzesCard).toContainText("2");

  // ...and survives a refresh
  await page.reload();
  await expect(page.getByText(`1 of ${SHOP_LESSONS} lessons completed`)).toBeVisible();

  // Resume from the dashboard
  await page.goto("/repo/acme/shop");
  await expect(page.getByRole("link", { name: /Continue Learning/ })).toBeVisible();
});

test("a second visitor does not see the first visitor's progress", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/progress");
  await expect(page.getByText("No Active Courses Yet")).toBeVisible();
  await page.goto("/repo/acme/shop");
  await expect(page.getByText(`0 / ${SHOP_LESSONS}`)).toBeVisible();
  await ctx.close();
});
