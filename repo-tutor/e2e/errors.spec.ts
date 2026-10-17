import { test, expect } from "@playwright/test";
import { SHOP_LESSONS, ensureAnalyzed, alertOf } from "./helpers";

test.describe("invalid input", () => {
  test("empty, malformed and non-GitHub URLs are rejected inline, without leaving the page", async ({ page }) => {
    await page.goto("/");
    const submit = page.getByRole("button", { name: "Teach Me This Repo" });
    const input = page.getByRole("textbox", { name: "GitHub repository" });

    await submit.click();
    await expect(page.locator("#url-error")).toContainText("Please enter a public GitHub repository URL");

    await input.fill("not a url");
    await submit.click();
    await expect(page.locator("#url-error")).toBeVisible();

    await input.fill("https://evil.example.com/acme/shop");
    await submit.click();
    await expect(page.locator("#url-error")).toContainText("Only public github.com repositories are supported");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/$/);

    await input.fill("https://github.com/acme");
    await submit.click();
    await expect(page.locator("#url-error")).toContainText(/owner and repository name/);
  });

  test("the server rejects bad input even if the browser check is bypassed", async ({ request }) => {
    const bad = await request.post("/api/analyze", { data: { url: "http://169.254.169.254/latest/meta-data" } });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.code).toBe("INVALID_URL");
    const huge = await request.post("/api/analyze", { data: { url: "https://github.com/acme/" + "x".repeat(5000) } });
    expect([400, 413]).toContain(huge.status());
  });
});

test.describe("repository errors are shown clearly (no fake content)", () => {
  test("a repository that does not exist: clear message, no retry, no course", async ({ page }) => {
    await page.goto("/repo/acme/missing?start=1");
    await expect(alertOf(page)).toContainText("Repository not found", { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0); // not retryable
    await expect(page.getByText("Live analysis")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Learning path" })).toHaveCount(0);
    await expect(page.getByText("Demo data")).toHaveCount(0);
  });

  test("rate limited: explains why and offers a retry", async ({ page }) => {
    await page.goto("/repo/acme/limited?start=1");
    await expect(alertOf(page)).toContainText(/rate limit/i, { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("an empty repository is reported as such", async ({ page }) => {
    await page.goto("/repo/acme/empty?start=1");
    await expect(alertOf(page)).toContainText(/no commits/i, { timeout: 20_000 });
  });

  test("a never-analysed repository shows the analyse prompt, not invented content", async ({ page }) => {
    await page.goto("/repo/acme/never-analysed");
    await expect(page.getByRole("button", { name: "Analyse this repository" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Learning path" })).toHaveCount(0);
    await page.goto("/repo/acme/never-analysed/code");
    await expect(page.getByRole("button", { name: "Analyse this repository" })).toBeVisible();
    await expect(page.locator("pre")).toHaveCount(0); // no sample code
  });

  test("failed analyses are not stored as complete", async ({ request }) => {
    const r = await request.post("/api/analyze", { data: { url: "https://github.com/acme/missing" } });
    const { id } = await r.json();
    await expect.poll(async () => (await (await request.get(`/api/analyze/${id}`)).json()).status, { timeout: 20_000 }).toBe("failed");
    const body = await (await request.get(`/api/analyze/${id}`)).json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.retryable).toBe(false);
  });
});

test.describe("loading states", () => {
  test("a slow analysis shows progress, then the live course", async ({ page }) => {
    await page.goto("/repo/acme/slow?start=1");
    const status = page.getByRole("status");
    await expect(status).toBeVisible();
    await expect(status).toContainText(/Contacting GitHub|Reading files|Waiting/);
    await expect(page.getByText("Live analysis")).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("unknown routes", () => {
  test("an unknown lesson gives a not-found page", async ({ page }) => {
    await ensureAnalyzed(page);
    await page.goto("/repo/acme/shop/lesson/does-not-exist");
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
  });
  test("an unknown top-level route gives a not-found page", async ({ page }) => {
    const r = await page.goto("/definitely-not-a-page");
    expect(r?.status()).toBe(404);
  });
});

test.describe("API failures reach the user and never become fake success", () => {
  test("analysis API error", async ({ page }) => {
    await page.route("**/api/analyze", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }) }));
    await page.goto("/repo/acme/neverseen?start=1");
    await expect(alertOf(page)).toContainText("Something went wrong on our side");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("network failure during analysis", async ({ page }) => {
    await page.route("**/api/analyze", (route) => route.abort());
    await page.goto("/repo/acme/neverseen2?start=1");
    await expect(alertOf(page)).toContainText("Could not reach the server");
  });

  test("quiz submission failure shows an error and no score", async ({ page }) => {
    await ensureAnalyzed(page);
    await page.route("**/api/progress/quiz", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }) }));
    await page.goto("/repo/acme/shop/lesson/layout");
    const { takeQuiz } = await import("./helpers");
    await takeQuiz(page, "layout", "correct");
    await expect(alertOf(page)).toContainText("Something went wrong on our side");
    await expect(page.getByText(/Score:/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit answers" })).toBeEnabled(); // can retry
  });

  test("completion failure shows an error and does not mark the lesson complete", async ({ page }) => {
    await ensureAnalyzed(page);
    await page.route("**/api/progress/complete", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DOWN", message: "Service unavailable." } }) }));
    await page.goto("/repo/acme/shop/lesson/reading-order");
    await expect(page.getByRole("button", { name: "Mark as Complete" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Mark as Complete" }).first().click();
    await expect(alertOf(page)).toContainText("Service unavailable");
    await expect(page.getByRole("button", { name: /Completed/ })).toHaveCount(0);
  });

  test("progress API failure shows an error with retry, never sample data", async ({ page }) => {
    await page.route("**/api/progress", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }) }));
    await page.goto("/progress");
    await expect(alertOf(page)).toContainText("Something went wrong");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByText("facebook/react")).toHaveCount(0);
    await expect(page.getByText("express")).toHaveCount(0);
  });

  test("code file fetch failure is shown in place of the code", async ({ page }) => {
    await ensureAnalyzed(page);
    await page.route("**/api/repo/acme/shop/file**", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }) }));
    await page.goto("/repo/acme/shop/code");
    await expect(page.locator("pre").first()).toContainText("Something went wrong on our side");
  });
});

test("dashboard totals match the analysed course", async ({ page }) => {
  await ensureAnalyzed(page);
  await page.goto("/repo/acme/shop");
  await expect(page.getByText(`/ ${SHOP_LESSONS}`).first()).toBeVisible();
});
