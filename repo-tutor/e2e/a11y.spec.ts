import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ensureAnalyzed } from "./helpers";

const PAGES: [string, string][] = [
  ["home", "/"],
  ["explore", "/explore"],
  ["progress (empty)", "/progress"],
  ["live dashboard", "/repo/acme/shop"],
  ["live lesson + quiz", "/repo/acme/shop/lesson/overview"],
  ["live code explorer", "/repo/acme/shop/code"],
  ["analyse prompt", "/repo/acme/never-analysed"],
  ["demo dashboard", "/repo/facebook/react"],
  ["not found", "/repo/acme/shop/lesson/zzz"],
];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("main")).toBeVisible();
}

test.describe("automated accessibility (axe-core, WCAG 2.0/2.1/2.2 A+AA)", () => {
  test.beforeAll(async ({ browser }) => {
    const p = await browser.newPage({ baseURL: "http://127.0.0.1:3200" });
    await ensureAnalyzed(p);
    await p.close();
  });

  for (const [label, url] of PAGES) {
    test(`${label}: no violations`, async ({ page }) => {
      await page.goto(url);
      await settle(page);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.help}\n   ${v.nodes.slice(0, 6).map((n) => n.target?.join(" ") + " :: " + (n.any[0]?.message ?? "").slice(0, 110)).join("\n   ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }

  test("quiz results state (after submitting) has no violations", async ({ page }) => {
    await page.goto("/repo/acme/shop/lesson/overview");
    const { takeQuiz } = await import("./helpers");
    await takeQuiz(page, "overview", "wrong");
    await expect(page.getByText(/Score:/)).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.help}\n   ${v.nodes.slice(0, 6).map((n) => n.target?.join(" ") + " :: " + (n.any[0]?.message ?? "").slice(0, 110)).join("\n   ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test("tutor answer states have no violations", async ({ page }) => {
    await page.goto("/repo/acme/shop");
    await page.getByLabel("Your question about this repository").fill("BADCITE where is listProducts?");
    await page.getByRole("button", { name: "Ask" }).click();
    await expect(page.getByText("Not verified")).toBeVisible({ timeout: 20_000 });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.help}\n   ${v.nodes.slice(0, 6).map((n) => n.target?.join(" ") + " :: " + (n.any[0]?.message ?? "").slice(0, 110)).join("\n   ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
});

test.describe("keyboard-only use", () => {
  test("the hero form can be reached, filled and submitted with the keyboard alone", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.id === "hero-repo-url");
    }
    expect(reached, "URL field reachable by Tab").toBe(true);
    await page.keyboard.type("https://github.com/acme/shop");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/repo\/acme\/shop/);
    await expect(page.getByText("Live analysis")).toBeVisible({ timeout: 30_000 });
  });

  test("every tab stop shows a visible focus indicator", async ({ page }) => {
    for (const url of ["/", "/repo/acme/shop", "/repo/acme/shop/lesson/overview", "/repo/acme/shop/code", "/explore"]) {
      await page.goto(url);
      await settle(page);
      const missing: string[] = [];
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
          const shadow = cs.boxShadow !== "none";
          const r = el.getBoundingClientRect();
          return { desc: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`, visible: outline || shadow, onscreen: r.width > 0 && r.height > 0 };
        });
        if (info && info.onscreen && !info.visible) missing.push(info.desc);
      }
      expect(missing, `${url}: focused elements without a visible indicator`).toEqual([]);
    }
  });

  test("the quiz is operable by keyboard (arrow keys + space + enter)", async ({ page }) => {
    await page.goto("/repo/acme/shop/lesson/overview");
    await settle(page);
    const first = page.locator("fieldset").first().getByRole("radio").first();
    await first.focus();
    await page.keyboard.press("Space");
    await expect(first).toBeChecked();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("fieldset").first().getByRole("radio").nth(1)).toBeChecked();
    await expect(page.getByRole("button", { name: "Submit answers" })).toBeDisabled(); // not all answered
  });

  test("a skip link jumps past the navigation", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe("semantics", () => {
  test("each page has one h1, a main landmark, and a descriptive title", async ({ page }) => {
    await ensureAnalyzed(page);
    for (const [label, url] of PAGES) {
      if (label === "not found") continue;
      await page.goto(url);
      await settle(page);
      await expect(page.getByRole("main")).toHaveCount(1);
      expect(await page.getByRole("heading", { level: 1 }).count(), `${label}: h1 count`).toBe(1);
      expect((await page.title()).length, `${label}: title`).toBeGreaterThan(3);
    }
  });

  test("status and alert regions are announced (live regions)", async ({ page }) => {
    await page.route("**/api/analyze", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ id: 99999, status: "queued" }) }));
    await page.route("**/api/analyze/99999", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: 99999, status: "processing" }) }));
    await page.goto("/repo/acme/pending-forever?start=1");
    await expect(page.getByRole("status")).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  async function pendingAnalysis(page: Page) {
    // Keep the analysis in "working" state so the mascot animation is on screen.
    await page.route("**/api/analyze", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ id: 99999, status: "queued" }) }));
    await page.route("**/api/analyze/99999", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: 99999, status: "processing" }) }));
    await page.goto("/repo/acme/pending-forever?start=1");
    await expect(page.getByRole("status")).toBeVisible();
    return page.locator("img[src*='mascot']").first();
  }
  const duration = (el: ReturnType<Page["locator"]>) => el.evaluate((n) => parseFloat(getComputedStyle(n).animationDuration) * (getComputedStyle(n).animationDuration.endsWith("ms") ? 0.001 : 1));

  test("animation runs normally by default", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const mascot = await pendingAnalysis(page);
    expect(await duration(mascot)).toBeGreaterThan(0.5);
  });

  test("animation and transitions are effectively disabled with prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const mascot = await pendingAnalysis(page);
    expect(await duration(mascot)).toBeLessThan(0.01);
    const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    expect(smooth).toBe("auto");
  });
});
