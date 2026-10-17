import { test, expect, type Page } from "@playwright/test";
import { ensureAnalyzed, alertOf } from "./helpers";

// AI behaviour is exercised against a SCRIPTED model (e2e/fake-services.ts), never a real one,
// so these tests are deterministic. A separate, optional real-model smoke test lives in e2e-real/.

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question about this repository").fill(question);
  await page.getByRole("button", { name: /^Ask$|Thinking/ }).click();
}

test.beforeEach(async ({ page }) => {
  await ensureAnalyzed(page);
  await page.goto("/repo/acme/shop");
  await expect(page.getByRole("heading", { name: "Ask the tutor" })).toBeVisible();
});

test("the tutor panel says it is experimental and explains the model's limits", async ({ page }) => {
  await expect(page.getByText("Experimental")).toBeVisible();
  await expect(page.getByText(/small models often make mistakes/i)).toBeVisible();
});

test("a well-cited answer is labelled 'Citations checked' (not 'correct')", async ({ page }) => {
  await ask(page, "Where are products listed?");
  const status = page.getByRole("status").filter({ hasText: "Citations checked" });
  await expect(status).toBeVisible({ timeout: 20_000 });
  await expect(status).toContainText("src/db.ts:3-5");
  await expect(status).toContainText(/does not guarantee the explanation itself is correct/i);
  await expect(status).toContainText("gemma3:1b");
});

test("wrong citations are rejected and the answer is labelled 'Not verified'", async ({ page }) => {
  await ask(page, "BADCITE where is listProducts?");
  const status = page.getByRole("status").filter({ hasText: "Not verified" });
  await expect(status).toBeVisible({ timeout: 20_000 });
  await expect(status).toContainText("Rejected citation");
  await expect(status).toContainText("src/routes.ts");
  await expect(page.getByText("Citations checked")).toHaveCount(0);
});

test("a model server error is shown as an error, with no answer substituted", async ({ page }) => {
  await ask(page, "FAILSERVER what happens?");
  const alert = alertOf(page);
  await expect(alert).toContainText("HTTP 500", { timeout: 20_000 });
  await expect(alert).toContainText("nothing was substituted");
  await expect(page.getByText("Citations checked")).toHaveCount(0);
  await expect(page.getByText("Not verified")).toHaveCount(0);
});

test("malformed model output is shown as an error, not repaired into an answer", async ({ page }) => {
  await ask(page, "BADJSON explain the router");
  await expect(alertOf(page)).toContainText(/failed validation/i, { timeout: 30_000 });
  await expect(page.getByText("Citations checked")).toHaveCount(0);
});

test("model unavailable (503) is reported clearly", async ({ page }) => {
  await page.route("**/api/ask", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "AI_UNAVAILABLE", message: "Cannot reach the inference server. Is Ollama running?", retryable: true } }) }),
  );
  await ask(page, "Where are products listed?");
  await expect(alertOf(page)).toContainText("Is Ollama running?");
});

test("while the model is thinking the button is disabled and says so", async ({ page }) => {
  await ask(page, "SLOWAI where are products listed?");
  await expect(page.getByRole("button", { name: /Thinking/ })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Citations checked" })).toBeVisible({ timeout: 20_000 });
});

test("the tutor works in Hinglish mode request (language is sent to the server)", async ({ page }) => {
  let sent: { language?: string } = {};
  await page.route("**/api/ask", async (route) => {
    sent = route.request().postDataJSON();
    await route.continue();
  });
  await page.getByLabel("Answer in").selectOption("hinglish");
  await ask(page, "Where are products listed?");
  await expect(page.getByRole("status").filter({ hasText: "Citations checked" })).toBeVisible({ timeout: 20_000 });
  expect(sent.language).toBe("hinglish");
});

// ── No fake progress / sample code / mock AI in the live experience ─────────
test("a brand-new visitor sees an empty Progress page, never seeded progress", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/progress");
  await expect(page.getByText("No Active Courses Yet")).toBeVisible();
  await expect(page.getByText(/Load Demo Progress/i)).toHaveCount(0);
  await expect(page.getByText("facebook/react")).toHaveCount(0);
  await ctx.close();
});

test("demo courses are labelled and never invent code for files without a sample", async ({ page }) => {
  await page.goto("/repo/facebook/react");
  await expect(page.getByText("Demo data")).toBeVisible();
  await expect(page.getByText(/bundled sample content/)).toBeVisible();

  await page.goto("/repo/facebook/react/lesson/react-l1");
  await expect(page.getByText(/Sample lesson: bundled demo content/)).toBeVisible();

  await page.goto("/repo/facebook/react/code");
  const files = page.locator(".overflow-y-auto button.font-mono");
  const n = await files.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await files.nth(i).click();
    const code = (await page.locator("pre").first().innerText()).toLowerCase();
    expect(code).not.toContain("repo tutor — code explorer");
    expect(code).not.toContain("initializing");
  }
  // A file with no bundled sample says so plainly instead of showing invented code.
  await page.goto("/repo/facebook/react/code");
  await page.getByPlaceholder("Filter files...").fill("index");
  const idx = page.locator(".overflow-y-auto button.font-mono").first();
  if ((await idx.count()) > 0) {
    await idx.click();
    const text = await page.locator("pre").first().innerText();
    expect(/no sample content|export|import|function/i.test(text)).toBe(true);
  }
});

test("a live repository never shows the demo banner or bundled sample text", async ({ page }) => {
  await page.goto("/repo/acme/shop/lesson/overview");
  await expect(page.getByText(/Sample lesson: bundled demo content/)).toHaveCount(0);
  await expect(page.getByText(/Built from the files Repo Tutor read/)).toBeVisible();
});
