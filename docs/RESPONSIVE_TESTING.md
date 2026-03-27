# Responsive Testing & Tooling

## Playwright Setup

- **Package**: `@playwright/test` with Chromium browser
- **Config**: `playwright.config.ts` with three test projects:
  - **setup** — authenticates once via Clerk, saves session
  - **public** — tests public pages without auth
  - **dashboard** — tests authenticated pages using saved session

## Playwright + axe-core Visual & Accessibility Tests

- **Package**: `@axe-core/playwright` for combined layout + WCAG auditing
- `__tests__/visual/responsive.spec.ts` — **21 tests** (7 public pages x 3 viewports)
  - Pages: `/`, `/sign-in`, `/sign-up`, `/beta`, `/privacy`, `/terms`, `/blog`
- `__tests__/visual/dashboard.spec.ts` — **45 tests** (15 dashboard pages x 3 viewports)
  - Pages: overview, tasks, vendors, budget, guests, wedding-party, seating, mood-board, day-of, rehearsal-dinner, website, settings, chat, guides, help
- Each test at each viewport (mobile 375px, tablet 768px, desktop 1280px):
  1. Takes a full-page screenshot saved to `__tests__/visual/screenshots/`
  2. Asserts no horizontal overflow (`scrollWidth <= innerWidth`)
  3. Runs axe-core WCAG 2.0 A + AA accessibility audit

## Clerk Auth for E2E

- **Package**: `@clerk/testing`
- `__tests__/visual/auth.setup.ts` — signs in with test credentials, saves `storageState` to `playwright/.auth/user.json`
- Test account: `mark.hope+e2e-test@eydn.app`
- Env vars `E2E_CLERK_USER_EMAIL` / `E2E_CLERK_USER_PASSWORD` in `.env.local` and Vercel
- Dashboard tests gracefully skip if credentials aren't configured

## Claude Code Skill

- **File**: `.claude/commands/responsive-audit.md`
- **Invoke**: `/responsive-audit`
- 15-issue checklist covering:
  - Flex stacking
  - Fixed widths
  - Table overflow
  - Sidebar mobile nav
  - Modal widths
  - Stat card grids
  - Text scaling
  - Padding
  - Button groups
  - Layout padding
  - Table column hiding
  - Form layouts
  - Header overflow
  - Progress components
  - Run history tables
- Ends with verification: `tsc` + `eslint` + `next build` + Playwright visual tests

## Running Tests

```bash
# Public pages only (no auth needed)
npx next dev &
sleep 10
npx playwright test --project=public

# Everything including dashboard (needs creds)
E2E_CLERK_USER_EMAIL=... E2E_CLERK_USER_PASSWORD=... npx playwright test

# View screenshots after run
explorer __tests__\visual\screenshots
```

## .gitignore Entries

```
playwright/.auth/
__tests__/visual/screenshots/
/test-results/
/playwright-report/
```
