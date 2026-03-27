Audit every file in `src/components/` and `src/app/` for Tailwind responsive issues and fix all of them.

Do not change any logic, colors, or non-layout styling — layout and spacing fixes only.

---

## Issue 1 — Flex and grid containers missing responsive modifiers

**Bad:**  `className="flex gap-4"`
**Good:** `className="flex flex-col sm:flex-row gap-4"`

**Bad:**  `className="grid grid-cols-4 gap-4"`
**Good:** `className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"`

Fix any flex row or multi-column grid that has no `sm:`, `md:`, or `lg:` prefix on its direction or column count.

---

## Issue 2 — Fixed width classes without a mobile override

**Bad:**  `className="w-[600px]"`
**Good:** `className="w-full max-w-[600px]"`

**Bad:**  `className="w-96"`
**Good:** `className="w-full max-w-96"`

Fix any element using a fixed `w-` value that would overflow a 375px screen.

---

## Issue 3 — Tables not wrapped in an overflow container

**Bad:**  `<table className="...">`
**Good:** `<div className="overflow-x-auto w-full"><table className="...">`

Fix every `<table>` element that is not already inside an `overflow-x-auto` wrapper.

---

## Issue 4 — Sidebar or nav not hidden on mobile

**Bad:**  `<aside className="w-64 ...">`
**Good:** `<aside className="hidden lg:block w-64 ...">`

If a hamburger menu and mobile nav drawer do not already exist, create them. The mobile drawer should slide in from the left, overlay the page content, and close when the user taps a nav item or taps outside the drawer.

Add a hamburger menu button that is only visible on mobile:
```tsx
<button className="lg:hidden ...">
  <Menu className="h-5 w-5" />
</button>
```

---

## Issue 5 — Modals and slide-overs with fixed widths

**Bad:**  `className="w-[500px]"`
**Good:** `className="w-full max-w-lg mx-4 sm:mx-auto"`

Fix any modal, dialog, drawer, or slide-over panel using a fixed pixel width.

---

## Issue 6 — Stat cards or tile rows that don't reflow

**Bad:**  `className="grid grid-cols-6 gap-4"`
**Good:** `className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"`

Fix the dashboard stats row and any other tile or card grid so it stacks to 2 columns on mobile and 3 columns on tablet.

---

## Issue 7 — Large text that doesn't scale down on mobile

**Bad:**  `className="text-4xl font-bold"`
**Good:** `className="text-2xl sm:text-3xl lg:text-4xl font-bold"`

Fix any heading using `text-3xl` or larger that has no mobile size override.

---

## Issue 8 — Horizontal padding too large on mobile

**Bad:**  `className="px-12"`
**Good:** `className="px-4 sm:px-8 lg:px-12"`

Fix any container using `px-8` or larger with no mobile padding override.

---

## Issue 9 — Buttons or form inputs that overflow on small screens

**Bad:**  `<div className="flex gap-4"><Button>Cancel</Button><Input /></div>`
**Good:** `<div className="flex flex-col sm:flex-row gap-4"><Button>Cancel</Button><Input /></div>`

Fix any button+input row, button group, or form action row that doesn't stack vertically on mobile.

---

## Issue 10 — Page-level layout containers missing responsive padding

**Bad:**  `<main className="p-8">`
**Good:** `<main className="p-4 sm:p-6 lg:p-8">`

Fix the root layout and any page-level wrapper that uses fixed padding with no mobile override.

---

## Issue 11 — TanStack Table columns not hidden on mobile

Wide tables with many columns are unreadable on mobile. Hide lower-priority columns on small screens:

```tsx
// On the column definition, add a responsive class to the header and cell
{
  id: 'phone',
  header: () => <span className="hidden sm:block">Phone</span>,
  cell: ({ row }) => (
    <span className="hidden sm:block">{row.original.phone}</span>
  )
}
```

Hide these columns below `sm` breakpoint (768px): Phone, Website, Score, Verified.
Always show on all sizes: Name, Category, Actions.

---

## Issue 12 — Form layouts that don't stack on mobile

**Bad:**  `<div className="grid grid-cols-2 gap-6">`
**Good:** `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">`

Fix any multi-column form layout that doesn't collapse to single column on mobile.

---

## Issue 13 — Header/topbar elements that overflow

The header should never cause horizontal scroll. On mobile it should show:
- App name or logo (left)
- Hamburger menu button (right)

Hide any secondary header elements (breadcrumbs, user menu text, etc.) below `sm`:
```tsx
<span className="hidden sm:block">Mark Hope</span>
```

---

## Issue 14 — Scrape progress component on mobile

If a per-source status list renders as a horizontal row, fix it to stack vertically on mobile:

**Bad:**  `className="flex gap-4"`
**Good:** `className="flex flex-col sm:flex-row gap-3 sm:gap-4"`

Progress bars should always be full width:
`className="w-full h-2 rounded-full bg-surface-2"`

---

## Issue 15 — Pipeline run history table on mobile

If a run history table has many columns, on mobile replace the table with a card-based list view using a responsive switch:

```tsx
{/* Table — hidden on mobile */}
<div className="hidden md:block overflow-x-auto">
  <RunHistoryTable ... />
</div>

{/* Card list — visible on mobile only */}
<div className="md:hidden space-y-3">
  {runs.map(run => (
    <div key={run.id} className="bg-surface rounded-lg p-4 border border-border">
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-sm">{run.category}</span>
        <StatusBadge status={run.status} />
      </div>
      <div className="text-xs text-muted space-y-1">
        <div>{run.market}</div>
        <div>{run.source} · {run.count} vendors</div>
      </div>
    </div>
  ))}
</div>
```

---

## After All Fixes

Run these commands and confirm all pass with zero errors before finishing:

```bash
npx tsc --noEmit
npx eslint src --max-warnings 0
npx next build
```

If any check fails, fix the issue and re-run until all three pass cleanly.

---

## Visual + Accessibility Verification with Playwright

After all code fixes pass the checks above, run the combined Playwright visual + accessibility audit. This uses `@axe-core/playwright` to catch both layout and WCAG 2.0 AA accessibility issues in a single pass.

The test at `__tests__/visual/responsive.spec.ts` will, for every page at mobile (375px), tablet (768px), and desktop (1280px):
1. Take a full-page screenshot
2. Check that `scrollWidth <= innerWidth` (no horizontal overflow)
3. Run axe-core for WCAG 2.0 A + AA violations

```bash
# Start the dev server in the background
npx next dev &

# Wait for it to be ready
sleep 10

# Run the visual + accessibility tests
npx playwright test --config=playwright.config.ts

# Stop the dev server
kill %1
```

Screenshots are saved to `__tests__/visual/screenshots/` with the naming pattern `{page}-{viewport}.png` (e.g. `home-mobile.png`, `sign-in-tablet.png`).

After the run completes, open the screenshots folder and confirm visually that no page has horizontal scrollbars at 375px width:

```bash
# Windows
explorer __tests__\visual\screenshots

# Mac
open __tests__/visual/screenshots
```

If any test fails due to horizontal overflow, fix the offending element and re-run. If any test fails due to axe-core accessibility violations, fix those too — common violations include missing alt text, insufficient color contrast, missing form labels, and missing landmarks.

### Adding New Pages

To add pages to the audit, edit the `PAGES` array in `__tests__/visual/responsive.spec.ts`.

To test authenticated dashboard pages, configure Playwright authentication via `storageState` in `playwright.config.ts` and add the dashboard paths to the `PAGES` array.
