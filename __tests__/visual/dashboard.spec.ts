import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Dashboard responsive + accessibility audit.
 * Requires auth setup to have run first (storageState from auth.setup.ts).
 * Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD to enable.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

const DASHBOARD_PAGES = [
  { name: "overview", path: "/dashboard" },
  { name: "tasks", path: "/dashboard/tasks" },
  { name: "vendors", path: "/dashboard/vendors" },
  { name: "budget", path: "/dashboard/budget" },
  { name: "guests", path: "/dashboard/guests" },
  { name: "wedding-party", path: "/dashboard/wedding-party" },
  { name: "seating", path: "/dashboard/seating" },
  { name: "mood-board", path: "/dashboard/mood-board" },
  { name: "day-of", path: "/dashboard/day-of" },
  { name: "rehearsal-dinner", path: "/dashboard/rehearsal-dinner" },
  { name: "website", path: "/dashboard/website" },
  { name: "settings", path: "/dashboard/settings" },
  { name: "chat", path: "/dashboard/chat" },
  { name: "guides", path: "/dashboard/guides" },
  { name: "help", path: "/dashboard/help" },
];

for (const viewport of VIEWPORTS) {
  for (const page of DASHBOARD_PAGES) {
    test(`dashboard/${page.name} — no layout overflow at ${viewport.name}`, async ({ page: p }) => {
      // Skip if auth setup didn't complete (no credentials)
      try {
        await p.context().storageState();
      } catch {
        test.skip(true, "Auth not configured — set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD");
        return;
      }

      await p.setViewportSize(viewport);
      await p.goto(page.path, { waitUntil: "networkidle", timeout: 15000 });

      // If redirected to sign-in, skip — auth not available
      if (p.url().includes("/sign-in")) {
        test.skip(true, "Redirected to sign-in — auth session not available");
        return;
      }

      // Screenshot
      await p.screenshot({
        path: `__tests__/visual/screenshots/dashboard-${page.name}-${viewport.name}.png`,
        fullPage: true,
      });

      // Check for horizontal overflow
      const hasOverflow = await p.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(
        hasOverflow,
        `${page.path} has horizontal overflow at ${viewport.name}`
      ).toBe(false);

      // Accessibility audit — exclude decorative and third-party elements
      const results = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa"])
        .exclude("[aria-hidden='true']")
        .exclude("[data-sonner-toaster]")
        .exclude("[class*='cl-']") // Clerk components
        .analyze();

      expect(
        results.violations.map(
          (v) =>
            `${v.id}: ${v.description} — targets: ${v.nodes
              .map((n) => n.target.join(" "))
              .join("; ")}`
        )
      ).toEqual([]);
    });
  }
}
