import { test, expect } from "@playwright/test";

// OPTIONAL real-model smoke test (see playwright.real.config.ts). Skipped unless RT_REAL_AI=1.
// A small local model may answer badly or fail validation; this test only asserts the app behaves honestly:
// the user always gets EITHER a labelled answer with a verification status OR a visible error. Never blank, never fake.
test.skip(!process.env.RT_REAL_AI, "set RT_REAL_AI=1 (needs Ollama running with the configured model)");

test("real model: the tutor returns a labelled answer or a visible error", async ({ page }) => {
  const r = await page.request.post("/api/analyze", { data: { url: "https://github.com/acme/shop" } });
  const { id } = await r.json();
  await expect.poll(async () => (await (await page.request.get(`/api/analyze/${id}`)).json()).status, { timeout: 30_000 }).toBe("completed");

  await page.goto("/repo/acme/shop");
  await page.getByLabel("Your question about this repository").fill("Where are products listed?");
  await page.getByRole("button", { name: /^Ask$/ }).click();

  const outcome = page.getByText(/verified|partially verified|unverified/i).or(page.getByRole("alert").filter({ hasText: /\w{4,}/ }));
  await expect(outcome.first()).toBeVisible({ timeout: 200_000 });
});
