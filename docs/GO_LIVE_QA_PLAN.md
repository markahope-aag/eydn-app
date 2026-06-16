# Eydn — Go-Live QA Plan (final pre-launch gate)

This is the **launch readiness gate** — the focused checklist run right before
flipping the switch (or right after a major release). It does **not** replace the
full functional passes in [`QA_TESTING_PROGRAM.md`](QA_TESTING_PROGRAM.md) /
[`QA_TEST_TRACKING.csv`](QA_TEST_TRACKING.csv); it sits on top of them and adds the
things a launch needs that day-to-day functional testing doesn't: infra/config
verification, a tight P0 smoke gate, regression of recent changes, the
non-functional bars, and a go/no-go decision with a rollback path.

**How to use it:** work top to bottom. Section 0 (config) and Section 1 (P0 smoke)
are hard blockers — if any fail, do not launch. Sections 2–8 are the readiness
sweep. Section 9 is the decision + launch-day runbook. Tag every item
**Pass / Fail / Blocked / N/A** and link bugs.

**Sign-off requires:** 0 open P0, 0 open P1; P2s triaged with an owner.

---

## Test data & accounts to prepare first

| Account | Purpose |
|---|---|
| **Fresh email (never seen)** | Clean signup → onboarding → trial path |
| **Trial account** | Mid-trial state (features on) |
| **Trial-expired / free account** | Free-tier caps, paywalls |
| **Paid (Pro) account** | Lifetime/Pro full access, no meter |
| **Admin account** | Admin panel, ops views |
| **2nd + 3rd emails** | Collaboration: invite Partner, Coordinator, Parent |
| **Stripe test cards** | `4242…` success; `4000 0000 0000 0002` decline; 3DS card |
| **A real card (live mode)** | One genuine end-to-end paid purchase + refund (see §3) |
| **Phones: iOS Safari + Android Chrome** | Mobile/PWA/push, real-device responsive |

Also have ready: the production URL (eydn.app), the Vercel dashboard, the Stripe
dashboard (live mode), the Clerk dashboard, the Supabase dashboard, and the
in-app admin panel (`/dashboard/admin`).

---

## 0. Config & infrastructure gate (P0 — verify before any user testing)

These are the launch traps that don't show up in functional clicks.

- [ ] **Stripe keys are LIVE in production** and **test in preview/dev** — confirm `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` per Vercel environment. A test key in prod = no real payments; a live key in preview = real charges from QA. **Verify the price IDs are the live-mode IDs.**
- [ ] **Stripe webhook** points at the production URL, is enabled, signing secret matches `STRIPE_WEBHOOK_SECRET`, and recent deliveries are 200. Fire a test event and confirm it's processed.
- [ ] **All required env vars set in production** (Anthropic, Tavily, Clerk live keys, Supabase URL/keys, Upstash, Resend, Google Places, Twilio, VAPID, `CRON_SECRET`, `ADMIN_EMAILS`). Spot-check the "Operations → AI & Integrations" admin grid — no red cards.
- [ ] **`ADMIN_EMAILS` is set** (was previously unset) so ops/cron-failure/model-health alerts actually reach someone. Trigger one alert path to confirm delivery.
- [ ] **Clerk** is in production instance, production domain configured, sign-in/up redirects correct, social providers (if any) live-keyed.
- [ ] **DNS / domain / SSL**: eydn.app resolves, valid cert, `www` and apex behave, HSTS present. Clerk proxy (`/__clerk`) and any custom domains resolve.
- [ ] **Security headers** present on prod responses: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`. Authenticated dashboard pages return `Cache-Control: no-store`.
- [ ] **robots.txt + sitemap.xml** correct (no `/beta`; no staging URLs; `/dashboard`, `/api` disallowed). Verify canonical/OG tags on key marketing pages.
- [ ] **Backups**: the `backup` cron has a recent successful run (SFTP configured) — confirm in the admin Cron Jobs tab.
- [ ] **Rate limits** active (Upstash reachable): hammering `/api/chat`, `/api/public/*`, and auth endpoints returns 429 past the limit.
- [ ] **Analytics live**: PostHog + GTM/GA fire on prod; conversion events (`trial_signup`, `ai_chat_message_sent`) land. **Confirm GTM container is the prod container, not a sandbox.**
- [ ] **Sentry** receiving events from prod (trigger the sentry-example path or a deliberate test error), correct environment tag, source maps uploaded.
- [ ] **No secrets in client bundle / logs**: grep the deployed JS for obvious keys; confirm no `sk_live`, service-role key, or Anthropic key is client-exposed.
- [ ] **Legal/consent**: privacy, terms, cookies, acceptable-use, disclaimer, accessibility pages load; cookie/consent banner behaves per region policy.

---

## 1. P0 launch-blocker smoke suite (must be 100% green)

The critical path. If any of these fail, it's no-go.

- [ ] **Homepage** loads fast, hero + feature images render (the new optimized photos), nav works, no console errors.
- [ ] **Sign up** with a fresh email → lands in onboarding.
- [ ] **Onboarding** completes (names, date, budget, guest estimate) → dashboard renders with a generated task timeline.
- [ ] **Core CRUD works**: add/edit a task, a guest, a vendor, a budget line — each persists across reload.
- [ ] **AI chat** answers a question and successfully takes a tool action (e.g., "add a task to call the florist") — verify the task appears.
- [ ] **AI vendor search** ("find photographers in Austin under $3K") returns real web results (Tavily + current model).
- [ ] **Upgrade flow**: start checkout, pay with a Stripe **test** card in the test env → returns as paid, paywalls lift. (Live-card test is §3.)
- [ ] **Wedding website**: enable it, publish, open the public URL in an incognito window — it renders; a guest can RSVP.
- [ ] **Sign out / sign in** round-trips cleanly; protected routes redirect when logged out.
- [ ] **No 500s** in the critical path (watch Sentry + Vercel logs during the run).

---

## 2. Regression focus — everything changed this release

Targeted re-test of recent work (cross-reference `CHANGELOG.md` 1.16.0 / 1.17.0).

### 2a. Collaboration & roles (RBAC)
- [ ] **Invite Partner** → accepts → full edit access (tasks/vendors/guests **and** the wedding date/budget).
- [ ] **Invite Coordinator** → can edit tasks/vendors/guests but **cannot** change the wedding date/budget/venue (gets a 403 / friendly block). [QA C7]
- [ ] **Invite Parent** → invite **sends** (no "Invitation didn't send"); they get **view-only** access — every edit attempt is blocked gracefully; the **view-only banner** shows; dashboard create buttons are hidden. [QA C8]
- [ ] **Remove a collaborator** → on their next **hard reload** they lose access and drop to the empty state (no stale dashboard from bfcache). [QA C6]
- [ ] Owner-only: only the owner can invite/remove collaborators.
- [ ] Re-invite same email handled gracefully; pending → accepted transition works.

### 2b. AI & subscription
- [ ] Chat runs on the current model (no "Couldn't reach Eydn"); budget optimizer, catch-up plan, task personalizer, vendor categorization all work.
- [ ] **Free tier**: tool-call meter decrements; hitting the monthly cap shows the friendly "used your free AI actions" message + "See pricing" CTA. [QA A6/A7]
- [ ] **Pro tier**: no meter pill visible anywhere.
- [ ] **Model-health monitor**: `/api/cron/model-health` runs (admin Cron Jobs tab) and would alert on a retired model.

### 2c. Beta removal verification
- [ ] `/beta`, `/beta/claim`, `/api/public/beta` all **404**; no "Beta Program" link anywhere; no Beta option in admin role picker.
- [ ] The **previously-beta users keep full access** (they were migrated to comped lifetime Pro) — spot-check one resolves as Pro with all features.
- [ ] Waitlist admin view still works; newsletter signup still adds to the waitlist.

### 2d. Marketing surfaces touched
- [ ] **/tools** and tool sub-pages show the header (logo → home, nav, Sign In/Start Trial); the calculator **embed** stays chrome-less.
- [ ] Homepage images are the new optimized ones; check the hero on a large monitor for acceptable sharpness.

---

## 3. Payments & billing (run a real live-mode transaction)

- [ ] One **genuine live purchase** with a real card end-to-end → access granted, receipt email sent, row in `subscriber_purchases`, Stripe dashboard shows it. **Then refund it** and confirm access revokes correctly.
- [ ] Test-mode: decline card → graceful error; 3DS card → challenge handled.
- [ ] Promo code (incl. **100% off** comp path → $0 → skips Stripe, grants access).
- [ ] Trial countdown accurate; trial-expiry reminder email; downgrade at expiry drops to free with data intact.
- [ ] Subscription state survives sign-out/in and is consistent across the dashboard, settings, and API.
- [ ] Chargeback/refund path documented in `OPERATIONS_MANUAL.md` matches reality.

---

## 4. Data integrity & core features

Run the full functional passes from the CSV; gate on these high-risk ones:
- [ ] **Wedding date change cascade**: rehearsal date moves, system task due dates shift, user-created tasks flagged for review, alert created. (No data loss.)
- [ ] Soft-delete + restore (trash) works; deleted items excluded from counts/exports.
- [ ] **Export** (JSON / binder PDF / calendar feed) produces complete, correct data.
- [ ] Concurrent edit by two collaborators — no clobbering/lost updates.
- [ ] Guest ↔ wedding-party sync; seating assignments; RSVP counts reconcile.
- [ ] Day-of binder auto-generation (≤14 days out) and manual generation.

---

## 5. Public, SEO & wedding website

- [ ] Public wedding website: all sections (story, schedule, travel, registry, FAQ, photos, RSVP) render; photo upload + moderation (approval-required) works; cover focal point respected.
- [ ] Guest RSVP from the public site writes correctly and is rate-limited.
- [ ] Blog: listing, articles, categories, images (all alt-texted [QA X11]), share/OG.
- [ ] Free tools (calculator + 3 quizzes): each gives a result, save/share links work, embed works in an iframe.
- [ ] SEO: titles/meta/canonical/OG on key pages; structured data valid; IndexNow submits new content.

---

## 6. Email & communications

- [ ] Transactional: signup welcome, collaborator invite, trial reminders, receipts — all deliver, render in major clients, links work.
- [ ] Lifecycle sequences fire on schedule (check `sequence_send_log`); audience filters correct.
- [ ] Unsubscribe + preference handling honored; no email to unsubscribed users.
- [ ] Resend webhook (bounces/complaints) processed; bounce/complaint rates visible in admin.
- [ ] No broken/placeholder content; sender domain authenticated (SPF/DKIM/DMARC).

---

## 7. Cron & background jobs

- [ ] Every cron in `vercel.json` has run recently / can be triggered (admin Cron Jobs tab): trial emails, lifecycle, deadlines, reminders, downgrade events, backup, storage cleanup, vendor refresh/geocode/photos, conversion report, indexnow, **health-monitor**, **model-health**.
- [ ] Dead-man's switch (`health-monitor`) would alert on a stalled job; a cron failure emails `ADMIN_EMAILS`.
- [ ] Cron auth: unauthenticated call to a cron route → 401.

---

## 8. Non-functional bars

### Performance (Core Web Vitals — run Lighthouse on prod)
- [ ] Landing LCP < 2.5s, CLS < 0.1, INP < 200ms; hero image preloaded with dimensions (no layout shift).
- [ ] Dashboard interactive quickly; no obvious N+1 / slow queries on first paint.
- [ ] Images served as WebP/AVIF via next/image at sensible sizes.

### Accessibility (Axe + manual)
- [ ] Keyboard-only nav through onboarding + dashboard; visible focus everywhere.
- [ ] Screen reader announces labels/landmarks; all images have alt text [QA X11]; AA color contrast.
- [ ] Reduced-motion respected.

### Responsive & cross-browser
- [ ] Breakpoints 320 / 375 / 768 / 1024 / 1440 / 1920 — no overflow, touch targets OK, on homepage, dashboard, public site, tools.
- [ ] Chrome, Firefox, Safari (desktop) + iOS Safari + Android Chrome.

### Security
- [ ] Authorization: a collaborator/parent cannot reach another wedding's data via direct API calls; removed user is fully cut off.
- [ ] RLS denies anonymous PostgREST access; service-role only on the server.
- [ ] Input validation / rate limiting on all public + auth endpoints; no SQL/XSS via user content (blog, captions, names).
- [ ] CSRF/state-changing forms protected; file uploads validated (type/size, safe paths).

### Resilience / error handling
- [ ] Friendly error states (not raw stack traces) for: AI down, payment failure, network loss, 404, 500.
- [ ] Empty states render for brand-new accounts (no data).

### Mobile / PWA
- [ ] Install prompt / manifest / icons; push subscription + a test notification deliver (VAPID/Twilio as applicable).

---

## 9. Go / No-Go decision + launch runbook

### Go/No-Go criteria
- **GO** when: §0 and §1 are 100% green, 0 open P0, 0 open P1, P2s triaged with owners, and rollback verified.
- **NO-GO** if: any payment/auth/data-loss defect, any P0/P1 open, or backups/observability not confirmed.

### Launch-day runbook
1. Final deploy from a clean `master`; tag the release.
2. Re-run §1 smoke on the live deployment.
3. Confirm Stripe live mode + one real transaction (§3), then refund.
4. Watch Sentry + Vercel logs + Stripe + email deliverability for the first 60–90 min.
5. Announce; keep the team on call for the first 24h.

### Rollback plan
- [ ] Know the **last-good Vercel deployment** and how to instant-rollback (`vercel rollback` / promote previous).
- [ ] DB changes since last-good are **forward-compatible** (no destructive migration that breaks the old build). If not, document the down path.
- [ ] A defined comms/runbook for a payment or auth outage (who flips what).

### Sign-off
| Area | Owner | Status | Date |
|---|---|---|---|
| Config & infra (§0) | | | |
| P0 smoke (§1) | | | |
| Regression (§2) | | | |
| Payments (§3) | | | |
| Data & features (§4) | | | |
| Public/SEO/website (§5) | | | |
| Email (§6) | | | |
| Cron/ops (§7) | | | |
| Non-functional (§8) | | | |
| **Final go/no-go** | | | |

---

> Bug logging: use the template in `QA_TESTING_PROGRAM.md`. Severity: **P0** =
> launch-blocker (payment/auth/data-loss/critical-path down), **P1** = major
> (broken feature, no workaround), **P2** = minor/cosmetic. Track in
> `QA_TEST_TRACKING.csv`.
