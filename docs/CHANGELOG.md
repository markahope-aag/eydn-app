# eydn Platform Changelog

This document tracks all notable changes, updates, and improvements to the eydn wedding planning platform.

## [1.16.0] — June 16, 2026

### Fixed: AI chat was down (retired model)

The chat model `claude-sonnet-4-20250514` reached its retirement date and started returning a 404, which took down all of Ask Eydn — plus the budget optimizer, task personalizer, and catch-up plan generator, which shared the model. All four now run on the current `claude-sonnet-4-6`, with chat tuned to medium reasoning effort to keep per-turn cost in check. Web search ("find me photographers in Austin under $3K") works again once the model was restored.

### New: daily model-health monitor

Because the Anthropic models API exposes no retirement date, a model silently 404s the day it's retired. A new daily cron (`/api/cron/model-health`, 17:00 UTC) pings every model the app uses and emails ops the moment one stops resolving — and warns ~30 days ahead of any date recorded in `src/lib/ai/model-registry.ts`. It's wired into the cron dead-man's-switch so a stalled monitor is itself caught. (Also fixed: `ADMIN_EMAILS` was unset in production, so prior ops alerts were silently going nowhere.)

### New: read-only Parent collaborator role

Couples can now invite a **Parent** as a view-only collaborator. Parents can browse the whole dashboard — tasks, guests, budget, plans — but cannot edit anything; every wedding-data mutation is blocked server-side with a friendly "view-only" message. A persistent view-only banner and hidden create buttons make the limitation clear. The role was already in the UI but had never been wired to the backend (the invite failed); it's now complete end to end. Migration `20260616120000_allow_parent_collaborator_role.sql`. See `COLLABORATION.md`.

### Fixed: collaborator permissions and access revocation

- **Coordinators can no longer change the wedding record** (date, budget, names, venue). This was unenforced — any collaborator could edit it, and changing the date cascades across the rehearsal dinner and all task due dates. It's now couple-only (owner/partner).
- **Removed collaborators lose access immediately on reload.** Access was already revoked server-side, but authenticated dashboard pages carried no cache headers, so a removed user's browser could show a stale dashboard from its back/forward cache. Dashboard responses are now `Cache-Control: no-store`.

## [1.15.0] — June 2, 2026

### New: optional Quick Start walk-through for new couples

New couples landed on the full dashboard cold. They now get an optional, simplified getting-started view that leads with the single most useful next step and a short setup checklist — set your date, budget, guest list, first vendor, and explore your tasks.

- Each step opens in a **focused overlay** where the couple completes the action in place (set the date, add a guest/vendor, tick a task) and returns to the walk-through — no bouncing between tabs. Each overlay also links to its full page for deeper work.
- **"Switch to full dashboard"** is always available, and the walk-through **auto-graduates** once setup is complete. It can be re-launched any time from Help & Support.
- Backed by a pure, unit-tested "next step" engine (`src/lib/onboarding/quick-start.ts`), a `weddings.quickstart_dismissed` flag, and a small `/api/quickstart-status` route. Migration `20260602000000_quickstart_dismissed.sql`.

### New: adjustable focal point for the wedding-website cover image

Tall or vertical cover photos were always centered by `object-cover`, which cut off the subject. Couples can now **drag (or tap) a focal-point dot** on the cover preview to choose which part of the photo stays in view. The choice is saved as a CSS `object-position` and applied to both hero layouts (full-screen and side-by-side) on the public site; uploading a new cover resets it to center. Stored in a new `weddings.website_cover_position` column (default `50% 50%`) — no image re-encoding, so it's instant and lossless. Migration `20260602100000_website_cover_position.sql`.

## [1.14.0] — June 1, 2026

### New: image library for email templates

Email templates store raw HTML, so adding an image previously meant hand-writing an `<img>` tag pointing at an externally hosted URL — there was no way to upload or manage images for emails in the app.

- **New admin page** at `/dashboard/admin/email-images` (sidebar: Operations → Email Images): upload an image, resize it to an email-appropriate width before upload (600 / 300 / 150 / original), set alt text, and manage the library (edit alt text, copy URL, copy `<img>` snippet, delete).
- **Insert image** button in the email template editor drops a mobile-safe `<img>` snippet at the cursor, sourced from the library.
- Resizing/compression runs in the browser via canvas (no `sharp`/server dependency); animated GIFs are left at original size to preserve animation.
- Backed by a public `email-images` storage bucket and the `email_images` metadata table, with admin-only API routes under `/api/admin/email/images`. Migration `20260601000000_email_images.sql`.

See `EMAIL_SEQUENCES.md` §4 for the operator how-to.

### Fixed: new accounts no longer show tasks as overdue on day one

The task seeder wrote the legacy `completed` boolean but never set the `status` field the task UI now reads. Auto-completed and already-booked starter tasks therefore defaulted to `not_started` and rendered as overdue for brand-new couples. The seeder now sets `status` in lockstep with `completed` for both parent tasks and sub-tasks.

### Fixed: notification dropdown stays on-screen on narrow widths

The notification bell's panel used a fixed width and could open partly off the edge of the screen on small browser widths with no way to scroll to the hidden content. It now caps to the viewport width while keeping its full size where there's room.

## [1.13.0] — May 28, 2026

### Critical: Stripe Pro Monthly subscriptions now persist

The webhook handler upserted `subscriber_purchases` on `stripe_subscription_id` but the table had no matching UNIQUE constraint, so Postgres returned `42P10`. The handler swallowed the error, returned 200 to Stripe, and the purchase row was never written — paid users stayed on the trial tier. Migration `20260528120000_subscriber_purchases_unique_subscription_id.sql` adds the missing constraint. The three `subscriber_purchases` write paths (`handleProMonthlyCheckout`, `handleSubscriberPurchase`, `handleSubscriptionCreated`) now throw on db errors so future failures trigger Stripe retries instead of silently dropping access.

### QR code generation moved off Uniqode

`qrcode` npm package replaces the Uniqode API for all RSVP QR generation. Same Supabase storage pattern (cache the public URL on `rsvp_tokens.qr_code_url`), so already-printed invitations and cached URLs keep working. `UNIQODE_API_KEY` / `UNIQODE_ORG_ID` env vars and the "service not configured" error path are gone.

**New: shared Wedding QR Code.** A single QR per wedding that points to the public site's RSVP lookup screen. Endpoint: `GET /api/wedding-website/qr/wedding`. Generated on demand, no caching needed — the URL it encodes never expires.

### New public surface: vision board share page

`/w/[slug]/vision` — read-only Pinterest-style grid of the couple's vision board, themed to match the wedding website. Strips vendor tags and locations (kept private on the dashboard). Couples can now hand a single link to a florist or planner. Gated on the wedding website being published. New route + `VisionBoardGrid.tsx` client component.

### RSVP plus-ones become full guest rows

When a guest accepted via the public website with a plus-one name, the API stored that as plain text on `plus_one_name` rather than creating a companion guest row. Result: plus-ones never appeared on the seating chart, in headcount, or in the meal count for catering.

- `/api/public/rsvp` now creates a companion guest row (`party_head_id` = head's id) on accept-with-plus-one, updates the existing companion if one was already there (preserving seat assignment and meal preference), and soft-deletes the companion on decline or plus-one removal.
- Migration `20260528130000_backfill_plus_ones_to_companions.sql` sweeps up any `plus_one_name` values still on head rows from earlier RSVPs and promotes them to companion rows.

### Vendor directory: preserve Google profile + auto Places fallback

Two related improvements:

- Adding a vendor from the directory now carries the source's `gmb_place_id` and cached `gmb_data` through to the new private vendor row. The detail page's enrich endpoint hits the cache instead of doing a fresh name+category text search that frequently failed to match. The enrichment endpoint also prefers a stored Place ID over re-searching, protecting any vendor added going forward. Fixes the "could not find this business on Google" error that appeared on vendors that had clearly just been pulled from Google.
- When the directory search returns zero results for a name, the directory now runs a Google Places lookup and surfaces a "Found on Google" card with category picker and Add button. Pro-gated (`vendorLookup` feature), 20/day cap, dedupe cache reused. Adding from this card routes through `/api/vendors/from-place`, which contributes to the public directory via quality gates and notifies the scraper.

### Catering: single final meal count for the caterer

Vendor meal counts were captured but never aggregated. Couples had to mentally sum guest meals + plus-one meals + vendor meals. Adds:

- A small summary line on the vendors tab whenever any vendor has a meal count.
- A "Final meal count for catering" card at the top of the Day-of planner's Vendors & Party tab, breaking the total into accepted guests, plus-ones coming, and vendor meals.

### Day-of timeline: auto-sort by time

Custom events appended to the bottom of the timeline regardless of the time entered. Now, when the time field blurs, the array re-sorts chronologically so the event lands in the right spot. Empty-time rows stay at the bottom (stable sort). Only triggers on time changes — editing event name, duration, or notes never reorders the list. `parseCeremonyTime` renamed to `parseTimeToMinutes` and exported.

### Day-of timeline: regenerate fixes stale row values

Timeline rows used uncontrolled inputs (`defaultValue`) with row keys based on list length only. Regenerating after a ceremony time change produced the same length and indices, so React kept the existing inputs mounted — they continued to display the old times even though state was updated. Row key now includes the ceremony time so all rows remount on regeneration.

### Seating chart: edit popover stays open

React 18 event delegation doesn't guarantee that synthetic `stopPropagation` prevents document-level mousedown listeners from firing. The reception seating chart's per-table edit popover used a document mousedown listener and relied on inner-popover `stopPropagation` to suppress it — so clicking any input inside the popover closed it. Now uses ref + `contains()` check.

### Seating chart: ceremony adds use inline forms

The ceremony tab's Add Officiant / Left Side / Right Side buttons used the native `window.prompt()` dialog, one field at a time. Replaced with inline form fields so name + role can be entered together and the flow stays in the app.

### Wedding website: visible checklist completion

The builder progress panel only listed outstanding sections. Completing a field made the item silently vanish; the only feedback was a small counter. Now renders every section with done items visibly checked off (green tick + strike).

### Wedding website: photo loading fixes on public site

Cover, round couple-photo, and wedding-party photos used `<Image fill>` with no `sizes` prop, defaulting to 100vw and fetching full-viewport-sized images for a 256px circle. Added appropriate `sizes` values and `unoptimized` so the Supabase signed URLs are served directly, removing the image proxy as a potential failure source.

### Onboarding: chat redirect + suppress second walkthrough

- Pressing Enter on the AI intro screen with a question typed fired the message at `/api/chat` then routed the couple to `/dashboard` — they never saw their question or the response. Now routes to `/dashboard/chat` when a question was submitted.
- After completing the survey, the post-survey feature-tour modal also fired. `tour_complete` is now marked true on initial wedding creation so the modal only shows for legacy users who never went through the survey.

### Guests: bulk imports default to "Save for Later"

CSV imports and phone-contact imports inserted guests without an `rsvp_status`, so the DB default of `"pending"` applied — implying an invite had gone out. Both bulk paths now set `rsvp_status: "not_invited"` to match the single-add form.

### Guests: inline "+ Child / +1" button

The companion-add input existed in the expanded details panel of each guest, buried below five other fields. Adds a small "+ Child / +1" pill next to the role badge on every top-level guest row — click expands the row and focuses the party input directly. Suppressed on companion rows themselves.

### Dashboard: couple photo previews immediately after upload

`AddCouplePhoto` relied on `router.refresh()` to repaint the parent server component with the new signed URL. The refresh isn't synchronous and sometimes left the placeholder visible after a successful upload. Now stashes the signed URL returned by the upload endpoint in local state and renders it inline.

### Documentation

- `USER_GUIDE.md` rewritten to reflect current app state (Pro Monthly + Lifetime pricing, current features, removed aspirational content like calendar sync / mobile app / API access that doesn't exist).
- In-app Help page FAQ refreshed with new entries for vision-board sharing, kids/plus-ones, caterer meal count, Google Places fallback, and Pro Monthly vs Lifetime comparison. User Guide tab descriptions updated. New "May 2026" entry in What's New.

---

## [1.12.0] - April 26, 2026

### Removed: Places API seeder pipeline

The Google Places batch-seeder pipeline has been removed in full. The scraper-import path now covers all structured vendor intake with proper quality gates (minimum score, street address, phone, website, and a finished description), making the Places pipeline redundant and actively harmful — it bypassed all of those gates and was the primary source of low-quality vendor rows slipping into the directory.

**What was removed:**
- Admin UI tab "Places Seed" at `/dashboard/admin/vendors` — renamed to **Import**. The auto-import rejections panel and CSV importer remain, now under the Import tab.
- API routes `/api/admin/places-seed-configs/` and `/api/admin/places-usage`
- Cron `/api/cron/seed-vendors` (previously ran Sundays 02:00 UTC)
- Library `src/lib/places-seeder.ts` and its unit tests
- DB tables `places_seed_configs` and `places_api_usage_log` (dropped via migration `20260426200028_drop_places_seed_tables.sql`)

**What is kept:**
- `src/app/api/places-photo/route.ts` — photo proxy used to render Places photo references on existing vendor rows
- `src/app/api/suggested-vendors/[id]/gmb/route.ts` — on-demand GMB enrichment from the vendor edit modal
- `src/lib/google-places.ts` — shared by the photo proxy and GMB enrichment routes
- `GOOGLE_PLACES_API_KEY` env var — still consumed by on-demand enrichment
- Existing `suggested_vendors` rows with `seed_source = 'places_api'` — the value is a valid audit marker; only the bookkeeping tables that backed the pipeline were dropped

---

## [1.11.0] - April 26, 2026

### Scraper integration — refresh cron, webhook receiver, photos, description quality, business status

Round 2 of the scraper integration, after surveying the scraper codebase end-to-end. Five additions:

**1. `description_status` quality rule.** The scraper marks each vendor's description as `'pending'` / `'ai_generated'` / `'needs_review'` / `'manually_written'`. We now reject `pending` and `needs_review` — those mean the source data was thin and Claude couldn't confidently rewrite. `manually_approved` overrides this like every other rule.

**2. New `photos text[]` column on `suggested_vendors` (couple-facing).** The scraper now produces Google Places photo references; we surface them as a first-class array. Frontend detects format: strings starting with `places/...` route through the existing `/api/places-photo?ref=...` proxy (keeps the API key server-side); other strings render as direct URLs. Included in the public API.

**3. New `scraper_extras jsonb` column (admin-only).** Stash for scraper-only fields with no first-class home: `instagram`, `facebook`, `pinterest`, `business_status`, `hours`, `lat`, `lng`, `description_status`, `review_count`. Surfaced in the admin edit modal's audit section. Distinct from `gmb_data` (reserved for live Places enrichment).

**4. `business_status` drives `active` flag.** When the scraper reports `CLOSED_PERMANENTLY` or `CLOSED_TEMPORARILY`, the vendor lands `active=false` (or gets flipped to inactive on refresh). Stays in the directory for admin audit but never shown to couples.

**5. Weekly refresh cron `/api/cron/refresh-vendors`.** Runs Saturdays 03:00 UTC. Picks up scraper-sourced vendors not refreshed in 90+ days, re-pulls current data from the scraper, updates mutable fields. Quality rules are NOT re-applied — once a vendor is in the directory, it stays unless an admin removes it. Bounded to 100 vendors per run; if more, increase frequency rather than batch size.

**6. Webhook receiver `/api/webhooks/scraper`.** HMAC-SHA256 signature verification (constant-time compare) against `SCRAPER_WEBHOOK_SECRET`. On verified `job.complete` for our `client_id`, triggers the import logic immediately — closes the latency gap from "up to 1 hour" to "near-real-time" without losing the cron's safety net. The scraper's own `lib/integrations/webhooks.ts` matches our verification scheme exactly.

**Edit modal additions:** Photo gallery preview (first 6 thumbs), description_status badge color-coded, business status, photo count, social URL chips.

**Normalization:** added more category aliases (`hair salon`, `salon`, `wedding cake bakery`, etc.) for cleaner first-import data.

**New env vars:**
- `SCRAPER_WEBHOOK_SECRET` — shared with the scraper's webhook config (Settings → Integrations in the scraper UI). Must match exactly. Without it, the receiver returns 503.

**Tests:** 4 new `checkQuality` cases for description_status; 7 new tests for `verifyWebhookSignature` (correct, wrong secret, tampered body, missing/empty/short/non-hex signature). Full suite green at 1353.

---

## [1.10.0] - April 26, 2026

### Auto-import vendors from external scraper, hourly + quality-gated

A new hourly cron (`/api/cron/import-vendors`) pulls new vendor rows from an external scraper's Supabase, normalizes them, applies Eydn's quality rules, and either inserts them into `suggested_vendors` or logs them to a new `vendor_import_rejections` table for admin review. End-to-end hands-off ingestion replaces what was previously a manual "Import from Supabase" click per batch.

Schema additions:
- `suggested_vendors.scraper_id text UNIQUE` — origin row id from the scraper, used for idempotent dedup across re-runs.
- `suggested_vendors.manually_approved boolean` — set when an admin overrides a quality rejection; honored by the quality checker so re-imports never re-reject.
- New `vendor_import_rejections` table — full raw scraper row + array of failed rules + audit timestamps.

Quality rules (`src/lib/vendors/quality.ts`, hardcoded — product decision, not data):
- `quality_score >= 35`
- street address required
- phone required
- website required

Normalization: expanded category aliases for `bakery`, `wedding cake bakery`, `hair salon wedding`, `hair salon`, `salon` so common scraper category strings now map cleanly into Eydn's enum.

Admin surface:
- New **Auto-import rejections** panel at the top of the Places Seed tab on `/dashboard/admin/vendors`. Filter by status (pending / overridden / all), expand a row to see all raw scraper fields, click Override to promote a rejected vendor to the directory anyway.
- Three new env vars (Vercel): `SCRAPER_SUPABASE_URL`, `SCRAPER_SUPABASE_KEY`, `SCRAPER_EYDN_CLIENT_ID`. Missing creds → cron no-ops gracefully (returns 200 with a note); the schedule stays enabled while you wire up.

Operationally idempotent: the cron skips any scraper row whose id is already in `suggested_vendors.scraper_id` OR `vendor_import_rejections.scraper_id`. Re-running is safe.

10 unit tests for `checkQuality` (each rule independently, manually_approved override, multiple-failure reporting). Full suite green at 1342.

---

## [1.9.0] - April 26, 2026

### Vendor quality score (admin-only)

Added a `quality_score numeric(5,2)` column to `suggested_vendors` for ranking signals from the external vendor data pipeline. Plumbed through every ingest path:

- **Supabase importer** — default column map maps remote `score` → local `quality_score`. Override via `column_map` if your source uses a different name.
- **CSV import** — accepts an optional `quality_score` column with numeric coercion + per-row validation.
- **Admin PATCH** — added to the editable allowlist on `/api/admin/suggested-vendors/[id]`.
- **Edit modal** — new numeric input field with a "(admin-only, not shown to couples)" hint.
- **Directory list** — score badge on each row + new sort dropdown (default: Score high → low).
- **Couple-facing API** — explicitly excluded from `/api/suggested-vendors` GET response (replaces `select('*')` with an explicit allowlist of public columns) so the score never leaks.

Partial index `idx_suggested_vendors_quality_score (quality_score DESC NULLS LAST) WHERE quality_score IS NOT NULL` for sort performance once row counts grow.

---

## [1.8.0] - April 25, 2026

### Vendor sourcing pipeline — Google Places API + CSV import

Two new ways to grow the curated `suggested_vendors` directory without writing code or running custom scripts. The directory now has five distinct sources:

- **Places API seeder** (new) — A scheduled cron pulls businesses from Google Places for category × city combinations the admin configures. Runs Sundays at 02:00 UTC; per-config refresh interval is 30 days. Bounded by a `PLACES_API_DAILY_CAP` env var (default 200 cost units, ~25 textSearch calls/day) and tracked in a new `places_api_usage_log` table. Admin UI at `/dashboard/admin/vendors` → Places Seed tab supports add/edit/run-now/disable per config.
- **CSV import** (new) — Admin uploads a CSV with `name, category, city, state` (required) plus optional fields (`website`, `phone`, `email`, `address`, `description`, `price_range`, `gmb_place_id`). Dry-run mode shows a preview before commit. Dedups on `gmb_place_id` first, then on `(name, city, state)` lowercase. Existing rows are not overwritten.
- **External Supabase import** (existing) — the "Import from Supabase" button on the Directory tab continues to be the path for ingesting from out-of-app vendor pipelines maintained in a separate Supabase project.
- **Manual entry** (existing) — admin form on the Directory tab.
- **Couple submissions** (improved) — approval now stamps `seed_source = 'submission'` and explicitly sets `active = true, featured = false` so the audit trail is consistent.

Schema additions:
- `places_seed_configs` table — categories × cities the cron should populate
- `places_api_usage_log` table — per-call audit + daily cap source of truth
- `suggested_vendors.gmb_place_id` (UNIQUE), `gmb_data`, `gmb_last_refreshed_at`, `seed_source`

The seeder writes basic info only (name, address, phone, website, place ID). Reviews, photos, and full GMB data are pulled on-demand when a couple opens a vendor card via the existing `/api/suggested-vendors/[id]/gmb` route — keeps per-row seeding cheap.

---

## [1.7.0] - April 25, 2026

### Vendor monetization removed in full

Per the Eydn Pledge, vendors are never charged. An earlier migration dropped the `vendor_placements` and `placement_tiers` tables, but left the surrounding surface area in place — vendor self-registration accounts, performance analytics, the dead-column placement fields on `suggested_vendors`, and the `'vendor'` user role. All of that is now gone.

What was deleted:
- **Tables**: `vendor_accounts`, `vendor_analytics`. Orphaned columns removed from `suggested_vendors` (`vendor_account_id`, `placement_tier`, `placement_expires_at`). The `'vendor'` role removed from the `user_roles_role_check` constraint.
- **API**: `/api/vendor-portal/account`, `/api/vendor-portal/analytics`, `/api/admin/vendor-accounts`. The dead `vendor_account_id` metadata branch in the Stripe checkout webhook handler.
- **UI**: `/dashboard/vendor-portal/page.tsx` (564 lines — the full vendor self-service dashboard). The Vendor Insights admin page (`/dashboard/admin/vendor-analytics`) was kept and slimmed: the Vendor Accounts and Active Placements / Monthly Revenue cards are gone; the page now shows only directory health, booking patterns, and submission queue depth.
- **Code helpers**: `trackVendorPlacement()` analytics helper removed.
- **Docs**: `docs/VENDOR_MARKETPLACE.md` deleted entirely. Surgical edits to ARCHITECTURE.md, API.md, DATABASE_SCHEMA.md, DEVELOPMENT.md, RESPONSIVE_LAYOUT_CHANGES.md, PRODUCT_VISION.md, README.md, docs/README.md.

What stayed:
- `suggested_vendors` (the curated platform directory)
- `vendor_submissions` (couples suggesting vendors for the directory)
- `vendors` (per-wedding vendor tracking)
- The marketing pages that name paid placements as a *competitor contrast* (`/pledge`, `/why-we-charge-for-pro`, `/what-free-costs`) — that's the brand position, not implementation.
- Google Places enrichment for individual vendor cards (post-hoc decoration, unaffected)

---

## [1.6.0] - April 12, 2026

### Freemium model — reverse trial to free tier

The business model has changed from a binary trial-to-lockout to a **freemium + reverse trial** structure. Couples who do not upgrade after their 14-day trial are now **downgraded to a free tier** rather than locked out. Their guest list, budget tracker, AI-personalized task timeline, partner collaboration, and wedding website remain accessible indefinitely. Pro-only features (AI chat web search, day-of binder export, vendor email templates, file attachments on real entities, AI catch-up plans, AI budget optimizer) are gated behind an upgrade prompt rather than a hard paywall.

The subscription library (`src/lib/subscription.ts`) was refactored from a single `hasAccess` boolean to an explicit `Tier` enum (`trialing | free | pro | beta | admin`) with a per-feature `Features` map. Legacy fields (`hasAccess`, `isPaid`, `isTrialing`, `trialDaysLeft`, `trialExpired`) are derived from the tier and kept for backward compatibility. New code should use `tier` and the `features` map directly, and should guard routes with `requireFeature(featureKey)` rather than the generic `requirePremium()`.

**Free-tier chat is capped** (tool calls, not messages) rather than blocked. The cap is enforced in `/api/chat` via `tool-call-counter.ts`; the `web_search` tool is filtered out of the tool list for free-tier users so Claude never attempts it.

A 3-day trial-expiry reminder email is sent by a new daily cron job (`/api/cron/trial-reminders`). The job uses `trial_reminder_sent_at` on the `weddings` table as a deduplication key so each couple receives at most one reminder email. Paid, beta, and admin users are skipped.

### AI features — catch-up plans and budget optimizer

Two new Pro-gated AI features are now live:

- **AI catch-up plans** — when a couple's planning progress has stalled (overdue tasks or nothing completed recently), the dashboard surfaces a personalized recovery plan generated by Claude. Plans are stored in the `catch_up_plans` table and can be dismissed once acted on.
- **AI budget optimizer** — when one or more budget categories have gone meaningfully over their estimated allocation, the budget page surfaces targeted optimization suggestions generated by Claude. Suggestions are stored in the `budget_optimizations` table and can be dismissed.

Both features follow the same generate-store-dismiss pattern. Free-tier users see an upgrade prompt instead of the plan content.

**AI task messages** — onboarding task messages are now personalized using Claude, replacing the previous hardcoded template text.

### Chat — hardening and free-tier UX

- Input disambiguation and validation improvements in the AI chat tools prevent incorrect matches on fuzzy vendor or guest names.
- A tool-call meter pill is shown on the chat page for free-tier users, displaying their usage against the monthly cap.
- After the trial ends, free-tier users see an upgrade banner in the chat UI rather than a hard block.

---

## [1.5.0] - March 2026

### Inclusive language — platform-wide

- Replaced "bride", "groom", "bridesmaids", and "groomsmen" throughout the UI with gender-neutral terms: Partner 1, Partner 2, Attendant, Honor Attendant, and Wedding Party
- Wedding party roles now default to "Attendant" rather than a gendered title
- Day-of planner timeline auto-assigns groups using "Partner 1", "Partner 2", and "Attendants" instead of gendered labels

### Date and time synchronization

- `ceremony_time` promoted to a first-class column on the `weddings` table; it is the single source of truth — `day_of_plans.content.ceremonyTime` is kept in sync but `weddings.ceremony_time` is canonical
- Date or time changes now cascade: milestone tasks auto-shift relative to the new wedding date; appointment-type tasks are flagged for manual review
- New `date_change_alerts` table records each change with `old_value`, `new_value`, affected tasks, and an `acknowledged` flag
- `DateSyncBanner` component added to the dashboard layout — renders a persistent amber warning banner for every unacknowledged alert, listing affected task names and their previous due dates; the banner requires explicit acknowledgment before it dismisses

### Budget page

- Monetary values now display with comma formatting (e.g., $12,500 instead of $12500)
- Remaining budget card is visually prominent — color changes to indicate healthy, tight, or over-budget states
- Empty state for the Budget vs. Spent chart when no expenses exist
- Budget allocation recommendations shown per category as a percentage of the total budget; the recommended amount is calculated from the stored percentage split
- "% of budget" indicator shown inline with each category row
- Legend on the Budget vs. Spent chart corrected
- Trash icons on expense rows appear on hover rather than always being visible

### Guest list

- Name fields auto-capitalize on entry
- "Not Invited" status renamed to "Save for Later" in the UI (the underlying `rsvp_status` value remains `not_invited`)
- "Awaiting" stat added to the header showing guests with `invite_sent` or `pending` status
- Venue capacity from the wedding record is shown alongside total guest count; an over-capacity warning appears when the list exceeds it
- Search bar added for filtering guests by name
- Sort options added (name, RSVP status, group)
- Column headers added to the guest table
- Trash icons on guest rows appear on hover
- CSV import includes a downloadable template (`guest-import-template.csv`)

### Wedding party

- Address fields added to each member card: address line 1, address line 2, city, state, zip (backed by new `wedding_party` columns)
- Job assignments now use multi-select chips rather than a single text input
- Shared attire note field added at the page level, stored in `weddings.shared_attire_note`
- Member avatar supports a photo upload
- X (close/remove) button added to member cards
- Trash icons appear on hover

### Seating chart — reception

- Distinct table shapes rendered visually: round, rectangle, and square
- Seat position dots shown around each table shape
- Zoom controls added to the canvas (percentage displayed)
- Undo button backed by a client-side undo stack
- Search field added to the unassigned guests panel

### Seating chart — ceremony

- Partner names pulled from onboarding data and shown in the ceremony layout
- Altar rendered with prominent visual hierarchy
- Aisle line drawn between left and right sides
- Processional reorder arrows allow changing the walk order without drag-and-drop
- Print button generates a printer-friendly version of the ceremony layout in a new window

### Vision board (mood board)

- Drag-and-drop file upload with visual drag-over state
- Custom categories supported alongside the preset list
- Vendor linking: each mood board item can be associated with a vendor from the wedding's vendor list, stored via the new `mood_board_items.vendor_id` foreign key
- URL input includes a hint/placeholder
- Location label display corrected
- Share button added
- Empty state placeholder shown when the board has no items

### Planning guides

- Progress bar across all guides showing percentage complete
- Consistent SVG icons used throughout
- Color-coded call-to-action buttons per guide state
- Time estimates shown per guide
- "Not Started" badge displayed on guides not yet begun
- Recommended completion order defined; the first incomplete guide in that order is labeled "Start here"

### Day-of planner

- Ceremony time input displayed prominently; value is read from and written back to `weddings.ceremony_time`
- Timeline event assignees use multi-select chips showing group names (Partner 1, Partner 2, Attendants, Vendors, Everyone, Family)
- Auto-assigned groups pre-populated when the timeline is generated from the ceremony time
- Duration field added to each timeline event
- Vendor category tags shown on timeline events where applicable
- Page uses a wider layout
- Export button hierarchy clarified; binder tooltip explains what the PDF export contains

### Rehearsal dinner

- Date and time fields use dedicated date/time picker inputs
- Timeline generator creates a suggested schedule based on the rehearsal start time
- Guest lookup pulls from the main guest list when adding rehearsal dinner attendees
- RSVP tracking for rehearsal dinner guests
- Host, dress code, and capacity fields added (backed by new `rehearsal_dinner` columns)
- Print button generates a printer-friendly rehearsal dinner summary

### CI and dependency fixes

- `picomatch` vulnerability resolved
- GitHub Actions updated to `actions/checkout@v6` and `actions/setup-node@v6`
- Security audit step in CI now runs with `--audit-level=high` to reduce noise from low/moderate false positives

### Database migrations (this release)

- `wedding_party`: added `address_line1`, `address_line2`, `city`, `state`, `zip`
- `weddings`: added `shared_attire_note`, `ceremony_time`
- `mood_board_items`: added `vendor_id uuid REFERENCES vendors(id)`
- `rehearsal_dinner`: added `hosted_by`, `dress_code`, `capacity`
- New table: `date_change_alerts` — tracks wedding date and ceremony time changes with acknowledgment workflow and affected-task list

---

## [1.4.0] - March 2026

### Brand Voice & Copy Audit
- Complete audit and rewrite of all user-facing copy across the app
- Established brand voice rules: warm, direct, real — no cheerleader energy
- Rewrote ~100 toast messages (errors and successes) to be calm and specific
- Removed all unnecessary exclamation points from success messages
- Rewrote all empty states to feel like potential, not absence
- Updated paywall, archive, and read-only messaging

### AI Assistant Persona Overhaul
- Complete rewrite of the system prompt with new persona specification
- Replaced "Friendly & warm / Romantic / Fun & energetic" with direct, honest, calm voice
- Added explicit "What You Never Do" rules (no "Oops!", "Amazing!", "Great question!", etc.)
- Added urgency flags to context: WEDDING IS THIS WEEK, FINAL MONTH, OVER BUDGET
- Added budget category status tracking (OVER/TIGHT/OK per category)
- Added overdue task highlighting and 14-day lookahead
- Added vendor status grouping (booked/contracted, in conversation, still needed)
- Added RSVP response rate calculation
- Integrated buildCoupleContext patterns for structured context injection

### Onboarding Flow Redesign
- Rebuilt from 11-screen conversational flow to 7-screen focused wizard
- Names moved before Date for personalization ("When's the wedding, Sarah?")
- Budget and Guest Count combined into single screen (both skippable)
- Two AI screens merged into one (intro + greeting + chat input)
- Existing Tools screen removed (moved to post-onboarding)
- Booked Vendors screen added back (drives task generation)
- AI greeting generated client-side from template with timeframe variants
- Budget allocations auto-calculated using percentage splits
- Review mode (?review=true) for revisiting from Settings

### Gift Registry Planning Guide
- New 5-section guide with 14 questions covering platform selection, Amazon setup, price range strategy, cash funds, and registry link collection
- Integration: completed guide auto-saves registry URLs to wedding website
- Registry links now appear in day-of binder PDF export

### Database Changes
- Added onboarding_survey table for prior planning tools segmentation
- Added venue_city column to weddings table
- Added Gift Registry section to binder PDF export

## [Current] - March 2026

### 🆕 Major Features Added

#### Wedding Collaboration System
- **Multi-role Access Control**: Owners can invite partners and coordinators
- **Role-based Permissions**: Different access levels for owners, partners, and coordinators
- **Auto-accept Invitations**: Automatic invitation acceptance when user signs up with matching email
- **Subscription Inheritance**: Collaborators inherit owner's premium status
- **Collaborative Comments**: Comment system for tasks, vendors, guests, and expenses

#### Mood Board Feature
- **Pinterest-style Interface**: Visual inspiration board with drag-and-drop organization
- **Category Organization**: Organize by Florals, Attire, Colors, Decor, Venue, etc.
- **Location Tagging**: Tag items for Ceremony, Reception, Bar, Lounge areas
- **Collaborative Editing**: All roles can add and organize mood board items
- **Soft Delete Support**: Deleted items preserved in audit trail

#### Premium Feature Enforcement
- **Server-side Protection**: Robust premium feature enforcement with `requirePremium()` function
- **Protected Endpoints**: AI chat, file uploads, and PDF exports require premium access
- **Trial Integration**: 14-day trial with full feature access
- **Paywall Components**: Client-side premium gates with upgrade prompts

### 🔧 Technical Improvements

#### Technology Stack Updates
- **Next.js 16.2.0**: Latest framework with App Router and server components
- **React 19.2.4**: Upgraded to latest React with concurrent features
- **TypeScript 5**: Strict type checking with improved developer experience
- **Tailwind CSS 4**: Modern utility-first styling framework
- **Clerk 7.0.5**: Enhanced authentication with middleware protection

#### Database Enhancements
- **36-table Schema**: Comprehensive database with 50+ auto-generated tasks
- **Soft Delete System**: Data preservation with audit trails
- **Row Level Security**: Enhanced RLS policies for multi-role access
- **Google Places Integration**: Vendor enrichment with business data caching
- **Activity Logging**: Comprehensive audit trail for all user actions

#### Security & Performance
- **Rate Limiting**: Upstash Redis-based rate limiting per endpoint
- **Security Headers**: Comprehensive security headers and CSP
- **Input Validation**: Enhanced validation with `pickFields` pattern
- **Audit Trails**: Complete activity logging and monitoring
- **Performance Optimization**: Bundle analysis and optimization

### 🔄 API Updates

#### New Endpoints
- `GET/POST/DELETE /api/collaborators` - Wedding collaboration management
- `GET/POST /api/comments` - Collaborative commenting system
- `GET/POST/PATCH/DELETE /api/mood-board` - Mood board management
- `POST /api/chat` - AI wedding assistant (premium)
- `POST /api/attachments` - File uploads (premium)

#### Enhanced Endpoints
- **Authentication**: All endpoints now support multi-role access control
- **Premium Protection**: Server-side premium feature enforcement
- **Rate Limiting**: All endpoints protected with appropriate rate limits
- **Audit Logging**: All data changes logged with user attribution

### 📱 User Experience Improvements

#### Dashboard Enhancements
- **Role Indicators**: Clear display of user role and permissions
- **Collaboration UI**: Intuitive invitation and management interface
- **Premium Indicators**: Clear premium feature identification
- **Responsive Design**: Optimized for all device sizes

#### Planning Tools
- **Enhanced Task System**: 50+ auto-generated tasks with AI guidance
- **Vendor Pipeline**: Google Places integration for business data
- **Guest Management**: Enhanced RSVP system with address collection
- **Budget Tracking**: 36 pre-seeded budget categories
- **Day-of Planning**: Comprehensive timeline and coordination tools

### 🏗 Infrastructure Updates

#### Deployment & Operations
- **Vercel Integration**: Edge functions and cron job scheduling
- **Environment Management**: Comprehensive environment variable documentation
- **Monitoring**: Enhanced logging and error tracking
- **Backup Strategy**: Automated backups with point-in-time recovery

#### Development Experience
- **Testing Framework**: Vitest 4.1.0 with React Testing Library
- **Code Quality**: ESLint 9 with Next.js configuration
- **Security Auditing**: Automated dependency vulnerability scanning
- **Documentation**: Comprehensive technical and user documentation

## [Previous Releases] - 2024-2025

### Version 1.0 - Initial Release (2024)

#### Core Features
- **Wedding Planning Dashboard**: Complete planning interface
- **Task Timeline**: 12-month planning schedule
- **Vendor Management**: Contact and pipeline management
- **Guest List**: RSVP tracking and management
- **Budget Tracker**: Expense tracking and management
- **Seating Charts**: Drag-and-drop seating arrangement
- **Wedding Party**: Member management and coordination

#### Technical Foundation
- **Next.js 14**: React framework with App Router
- **Supabase**: PostgreSQL database with authentication
- **Clerk**: User authentication and management
- **Stripe**: Payment processing
- **Tailwind CSS**: Utility-first styling

#### Business Model
- **14-day Trial**: Full feature access trial period
- **$79 One-time Purchase**: Lifetime access model
- **Vendor Marketplace**: Tiered vendor placement system

### Version 1.1 - AI Integration (2024)

#### AI Features
- **eydn AI Assistant**: Claude-powered wedding planning guidance
- **Contextual Responses**: AI responses based on wedding data
- **Task Recommendations**: AI-generated task suggestions
- **Planning Insights**: Intelligent planning recommendations

#### Enhanced Features
- **Public Wedding Websites**: Guest-facing wedding sites
- **RSVP System**: Online RSVP with meal preferences
- **Photo Gallery**: Guest photo sharing with approval
- **Registry Integration**: Wedding registry links

### Version 1.2 - Vendor Marketplace (2025)

#### Marketplace Features
- **Vendor Portal**: Business account management
- **Tiered Placements**: Premium, featured, and standard listings
- **Analytics Dashboard**: Vendor performance tracking
- **Lead Generation**: Couple-to-vendor connection system

#### Platform Enhancements
- **Admin Dashboard**: Platform management interface
- **Vendor Directory**: Curated vendor recommendations
- **Search & Filtering**: Advanced vendor discovery
- **Review System**: Vendor rating and review platform

## Breaking Changes

### March 2026 Updates

#### Database Schema Changes
- **New Tables**: `wedding_collaborators`, `comments`, `mood_board_items`
- **Enhanced Tables**: Added soft delete columns, audit fields
- **RLS Updates**: New policies for multi-role access

#### API Changes
- **Authentication**: `getWeddingForUser()` now returns role information
- **Premium Enforcement**: New `requirePremium()` middleware
- **Rate Limiting**: All endpoints now have rate limiting

#### Environment Variables
- **New Required**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Optional**: `GOOGLE_PLACES_API_KEY`, `RESEND_API_KEY`

## Migration Guide

### Updating from Previous Versions

#### Database Migration
```bash
# Run latest migrations
supabase db push

# Verify migration success
supabase db diff
```

#### Environment Setup
```env
# Add new required variables
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional enhancements
GOOGLE_PLACES_API_KEY=your_google_key
RESEND_API_KEY=your_resend_key
```

#### Code Updates
```typescript
// Update authentication calls
const result = await getWeddingForUser();
if ("error" in result) return result.error;
const { wedding, role, userId } = result; // Now includes role

// Add premium protection
const premiumCheck = await requirePremium();
if (premiumCheck) return premiumCheck;
```

## Upcoming Features

### Q2 2026 Roadmap

#### Enhanced Collaboration
- **Real-time Collaboration**: Live editing and updates
- **Activity Feeds**: Real-time activity notifications
- **Advanced Permissions**: Granular permission controls
- **Bulk Invitations**: Invite multiple collaborators at once

#### AI Enhancements
- **Advanced Planning**: More sophisticated AI recommendations
- **Budget Optimization**: AI-powered budget suggestions
- **Vendor Matching**: Intelligent vendor recommendations
- **Timeline Optimization**: AI-optimized planning schedules

#### Mobile Experience
- **Progressive Web App**: Enhanced mobile experience
- **Offline Support**: Core features available offline
- **Push Notifications**: Mobile push notification support
- **Mobile-first Features**: Mobile-optimized planning tools

### Q3 2026 Roadmap

#### Integration Platform
- **Third-party Integrations**: Calendar, email, and CRM integrations
- **API Platform**: Public API for third-party developers
- **Webhook System**: Real-time event notifications
- **Import/Export**: Enhanced data portability

#### Advanced Features
- **Multi-language Support**: International localization
- **Custom Branding**: White-label options for professionals
- **Advanced Analytics**: Detailed planning insights
- **Automated Workflows**: Smart automation for common tasks

## Support & Documentation

### Updated Documentation
- **[Security Guide](SECURITY.md)**: Comprehensive security documentation
- **[Troubleshooting Guide](TROUBLESHOOTING.md)**: Common issues and solutions
- **[API Documentation](API.md)**: Complete API reference with new endpoints
- **[Architecture Guide](ARCHITECTURE.md)**: Updated system architecture
- **[Development Guide](DEVELOPMENT.md)**: Current setup and deployment instructions

### Support Resources
- **Technical Support**: dev@eydn.com
- **User Support**: support@eydn.com
- **Security Issues**: security@eydn.com
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Always up-to-date with latest changes

---

This changelog is continuously updated with each release. For the most current information, always refer to the latest version in the repository.