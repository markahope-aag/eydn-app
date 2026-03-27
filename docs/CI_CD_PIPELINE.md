# CI/CD Pipeline

## Overview

The Eydn CI pipeline runs on every push to `master` and every pull request against `master`. It validates code quality, runs tests, checks accessibility, and audits security — all before code reaches production.

**Workflow file:** `.github/workflows/ci.yml`

## Pipeline Architecture

```
install ──→ build ──→ typecheck-lint  (parallel)
                  ──→ playwright      (parallel)
       ──→ test                       (parallel with build)
       ──→ security-audit             (parallel with build)
```

### Job Dependencies

| Job | Depends On | Purpose |
|-----|-----------|---------|
| **Install** | — | Single `npm ci`, caches `node_modules` |
| **Build** | Install | `next build`, caches `.next` output |
| **Type Check & Lint** | Build | `tsc --noEmit` + `eslint src/` |
| **Unit Tests** | Install | `vitest run --coverage` |
| **Playwright** | Build | 67 responsive + accessibility tests |
| **Security Audit** | Install | `npm audit --omit=dev --audit-level=high` |

### Why This Order

- **Build depends on Install** because it needs `node_modules`.
- **Type Check & Lint depend on Build** because Next.js generates route context types during build that TypeScript needs.
- **Unit Tests and Security Audit only need Install** — they run in parallel with the build job to save time.
- **Playwright needs Build** because it runs against `next start` (production server), which requires a built `.next` directory.

## Jobs

### 1. Install

Runs `npm ci` once and caches `node_modules` keyed by `package-lock.json` hash. All downstream jobs restore from this cache instead of running their own install.

### 2. Build

Runs `npx next build` with placeholder environment variables (Supabase, Clerk, Sentry). The build output (`.next` directory) is cached and shared with the typecheck-lint and Playwright jobs.

**Placeholder env vars** are used because the build step only needs valid variable shapes, not real credentials. Real secrets are only injected into jobs that need them (Playwright).

### 3. Type Check & Lint

- **TypeScript:** `npx tsc --noEmit` — validates all types, including Next.js generated route types from the build step.
- **ESLint:** `npx eslint src/` — zero warnings allowed.

### 4. Unit Tests

Runs `npx vitest run --coverage` for all unit and integration tests. Coverage reports are uploaded as a downloadable artifact on every run.

### 5. Playwright — Responsive & Accessibility

Runs 67 tests across 22 pages at 3 viewport sizes (mobile 375px, tablet 768px, desktop 1280px).

**What it checks:**
- **No horizontal overflow** — `scrollWidth <= innerWidth` at every viewport
- **WCAG 2.0 AA compliance** — via axe-core (color contrast, button labels, ARIA roles, form labels, keyboard accessibility)

**Test breakdown:**
- 21 public page tests (7 pages x 3 viewports) — no auth needed
- 1 auth setup test — signs in via Clerk Backend API
- 45 dashboard page tests (15 pages x 3 viewports) — authenticated

**How auth works:**
The auth setup test uses the Clerk Backend API to create a sign-in token for the E2E test account, then navigates to the app to establish a session. The session cookies are saved to `playwright/.auth/user.json` and reused by all dashboard tests via Playwright's `storageState`.

**Screenshots** are uploaded as a downloadable artifact on every run (pass or fail), so you can visually review any page at any viewport.

**Server:** Uses `next start` (production mode) rather than `next dev` for faster startup and more representative rendering.

### 6. Security Audit

Runs `npm audit --omit=dev --audit-level=high` to flag known vulnerabilities in production dependencies.

## Concurrency

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

If you push again while a CI run is still in progress on the same branch, the old run is cancelled. This prevents wasting resources on outdated commits.

## Secrets

The following GitHub Actions secrets are required for the Playwright job:

| Secret | Purpose |
|--------|---------|
| `CLERK_SECRET_KEY` | Clerk Backend API — creates auth tokens for E2E |
| `E2E_CLERK_USER_EMAIL` | Test account email |
| `E2E_CLERK_USER_PASSWORD` | Test account password |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (API routes) |
| `UPSTASH_REDIS_REST_URL` | Redis for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token |

These are set in the GitHub repository settings under Settings > Secrets and variables > Actions.

## Artifacts

| Artifact | Job | Contents |
|----------|-----|----------|
| `coverage-report` | Unit Tests | Istanbul coverage report |
| `playwright-screenshots` | Playwright | Full-page screenshots at all viewports |

Artifacts are downloadable from the GitHub Actions run page for 90 days.

## Adding New Pages to Playwright

To add a new public page, edit the `PAGES` array in `__tests__/visual/responsive.spec.ts`.

To add a new dashboard page, edit the `DASHBOARD_PAGES` array in `__tests__/visual/dashboard.spec.ts`.

## Running Locally

```bash
# Unit tests
npx vitest run

# Playwright (needs dev server running)
npx next dev &
sleep 10
npx playwright test --project=public
CLERK_SECRET_KEY=... E2E_CLERK_USER_EMAIL=... E2E_CLERK_USER_PASSWORD=... \
  npx playwright test --project=setup --project=dashboard

# Full CI equivalent
npx tsc --noEmit
npx eslint src/
npx next build
npx vitest run
npm audit --omit=dev --audit-level=high
```

## Deployment

Deployment is handled by Vercel, not this CI pipeline. Vercel builds and deploys automatically on push to `master`. The CI pipeline validates code quality and catches regressions — Vercel handles the actual deployment.
