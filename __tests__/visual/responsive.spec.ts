import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Combined responsive layout + accessibility audit.
 * Screenshots every page at mobile/tablet/desktop widths,
 * checks for horizontal overflow, and runs axe-core for WCAG 2.0 AA violations.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

const PAGES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/beta",
  "/privacy",
  "/terms",
  "/blog",
];

for (const viewport of VIEWPORTS) {
  for (const path of PAGES) {
    const pageName = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");

    test(`${path} — no layout overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(path, { waitUntil: "networkidle" });

      // Screenshot for visual reference
      await page.screenshot({
        path: `__tests__/visual/screenshots/${pageName}-${viewport.name}.png`,
        fullPage: true,
      });

      // Fail on horizontal overflow — the #1 mobile bug
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(
        hasOverflow,
        "Page has horizontal overflow — content wider than viewport"
      ).toBe(false);

      // Fail on accessibility violations (catches many layout issues too)
      // Exclude decorative aria-hidden elements from contrast checks
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .exclude("[aria-hidden='true']")
        .analyze();

      expect(
        results.violations.map((v) => `${v.id}: ${v.description}`)
      ).toEqual([]);
    });
  }
}
