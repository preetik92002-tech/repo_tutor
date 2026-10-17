import { test, expect, type Page } from "@playwright/test";
import { ensureAnalyzed } from "./helpers";

const VIEWPORTS = [
  { name: "phone 360x640", width: 360, height: 640 },
  { name: "phone 390x844", width: 390, height: 844 },
  { name: "tablet 768x1024", width: 768, height: 1024 },
  { name: "laptop 1280x800", width: 1280, height: 800 },
];
const ROUTES = ["/", "/explore", "/progress", "/repo/acme/shop", "/repo/acme/shop/lesson/overview", "/repo/acme/shop/code", "/repo/facebook/react"];

async function overflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const wide = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed"; })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)}`);
    return { scroll: de.scrollWidth, inner: window.innerWidth, wide };
  });
}

test.beforeAll(async ({ browser }) => {
  const p = await browser.newPage({ baseURL: "http://127.0.0.1:3200" });
  await ensureAnalyzed(p);
  await p.close();
});

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`no horizontal page scroll on ${route}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        const o = await overflow(page);
        // The page itself must not scroll sideways (code blocks may scroll inside their own box).
        expect(o.scroll, `scrollWidth ${o.scroll} > viewport ${o.inner}; offenders: ${o.wide.join(", ")}`).toBeLessThanOrEqual(o.inner + 1);
      });
    }
  });
}

test.describe("mobile specifics", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test("navigation menu opens, is labelled and reaches Explore", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /menu/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await page.getByRole("link", { name: "Explore" }).first().click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test("Code Explorer uses the Files / Code / Explanation tabs", async ({ page }) => {
    await page.goto("/repo/acme/shop/code");
    await expect(page.locator("pre").first()).toBeVisible();
    await page.getByRole("button", { name: "Files", exact: true }).click();
    await expect(page.getByPlaceholder("Filter files...")).toBeVisible();
    await page.getByRole("button", { name: "db.ts" }).click();
    await expect(page.locator("pre").first()).toContainText("listProducts"); // auto-switches back to Code
    await page.getByRole("button", { name: "Explanation", exact: true }).click();
    await expect(page.getByText("What this file does")).toBeVisible();
  });

  test("lesson syllabus drawer opens and closes", async ({ page }) => {
    await page.goto("/repo/acme/shop/lesson/overview");
    await page.getByRole("button", { name: "Toggle lessons navigation" }).click();
    await expect(page.getByText("Lessons in Course")).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByText("Lessons in Course")).toHaveCount(0);
  });

  test("a full quiz can be taken on a phone", async ({ page }) => {
    const { takeQuiz } = await import("./helpers");
    await page.goto("/repo/acme/shop/lesson/layout");
    await takeQuiz(page, "layout", "correct");
    await expect(page.getByText(/Score: 1 \/ 1/)).toBeVisible();
  });

  test("primary controls are at least 24x24 CSS px (WCAG 2.2 target size)", async ({ page }) => {
    for (const route of ["/", "/repo/acme/shop", "/repo/acme/shop/lesson/overview"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [role=button]")]
          .filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !el.classList.contains("sr-only") && !(el instanceof HTMLInputElement && el.closest("label")) && (r.width < 24 || r.height < 24) && !(el.tagName === "A" && cs.display === "inline"); })
          .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 25)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
      );
      expect(small, `${route}: undersized targets`).toEqual([]);
    }
  });
});
