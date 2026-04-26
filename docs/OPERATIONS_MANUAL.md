# Eydn Platform Operations Manual

This manual is for the **platform operator** — the founder, an ops manager, or a support lead. It answers "How do I do X?" for the tasks you'll actually need to perform. It assumes you have admin access to the Eydn app and access to the service dashboards (Vercel, Supabase, Stripe, Clerk, Resend). You do not need to read code.

**Before you start:** Your admin access to the app is gated by a role in the database. If you need to grant yourself admin access for the first time, go to `/dashboard/admin` — a "Make Me Admin" button appears if you're the first user to reach that page. This is a one-time setup.

---

## Contents

1. [Daily / weekly health checks](#1-daily--weekly-health-checks)
2. [User management](#2-user-management)
3. [Billing and payments](#3-billing-and-payments)
4. [Email and communications](#4-email-and-communications)
5. [Cron jobs and background tasks](#5-cron-jobs-and-background-tasks)
6. [Incident response](#6-incident-response)
7. [Monitoring](#7-monitoring)
8. [User support workflows](#8-user-support-workflows)
9. [Routine maintenance calendar](#9-routine-maintenance-calendar)
10. [Waitlist and growth ops](#10-waitlist-and-growth-ops)
11. [Vendor directory management](#11-vendor-directory-management)

---

## 1. Daily / weekly health checks

**Normal looks like:** green across the board in the admin overview, no red cron jobs, delivery rate above 98%, no Sentry spike, uptime 100%.

### What to look at each morning (< 5 minutes)

1. Go to `/dashboard/admin` (the Overview tab). You'll see: total subscribers, new signups in the last 7 days, active users in the last 7 days, trial-to-paid conversion rate, and the subscription funnel (active trials / expired / paid). Nothing to act on unless a number has moved dramatically overnight.

2. Click the **Cron Jobs** tab. Every job card shows a green or red dot. A red dot means the last run errored. See [§5 — how to diagnose and re-run a failed cron](#5-cron-jobs-and-background-tasks).

3. Click **Operations → AI & Integrations** (left sidebar). You'll see a grid of all external connections. Any red card means an API key is missing or invalid. You'll also see "Bounces (7d)" and "Complaints (7d)" highlighted in amber if non-zero — act on those (see [§4 — email delivery health](#4-email-and-communications)).

### Weekly (Mondays, ~10 minutes)

- Check Sentry at [sentry.io](https://sentry.io) for your `eydn-app` project. Look at new issues since last Monday. Anything with more than 10 occurrences needs a ticket.
- Check Vercel Analytics at [vercel.com/dashboard](https://vercel.com/dashboard) for the `eydn-app` project. Look at the Functions tab for error rate and P99 latency. Normal: error rate under 0.5%, P99 under 2 seconds.
- Review the weekly conversion report. This is emailed automatically every Monday at 13:00 UTC by the `weekly-conversion-report` cron. If you did not receive it, check the Cron Jobs tab and look at `weekly-conversion-report` execution history.

---

## 2. User management

### How do I promote a user to admin or grant beta access?

The Subscribers tab in the admin panel is your primary tool.

1. Go to `/dashboard/admin?tab=subscribers`.
2. Search for the user by name or email using the search box.
3. In the **Role** column, click the dropdown next to their name.
4. Select **Admin** (full admin panel access) or **Beta** (permanent full feature access, no payment required) and the change saves immediately.

The allowed roles are:
- **Subscriber** — a normal user (may be trialing, free tier, or paid)
- **Beta** — permanent full access, no Stripe charge ever required
- **Admin** — full access plus access to `/dashboard/admin`

### How do I comp a Lifetime account (grant paid access without charging)?

Comping a user means bypassing Stripe entirely and writing a purchase record directly.

**Option A — use a 100% promo code (preferred):** Create a promo code with a 100% discount (see [§3 — promo codes](#3-billing-and-payments)), send it to the user, and they redeem it at `/dashboard/pricing`. The system detects the $0 final price and skips Stripe, granting access immediately.

**Option B — insert a purchase record directly in Supabase:** This is permanent — there is no undo from the UI. Use the Supabase SQL Editor.

> Warning: This directly modifies the billing database. Double-check the `user_id` (the Clerk user ID — find it in the Subscribers tab, it starts with `user_`) before running.

```sql
INSERT INTO public.subscriber_purchases (user_id, amount, status, plan)
VALUES ('user_REPLACE_ME', 0.00, 'active', 'lifetime');
```

### How do I suspend or temporarily block a user?

There is no "suspend" button in the Eydn admin panel. The closest options are:

1. **Disable their account in Clerk** (recommended): Go to [dashboard.clerk.com](https://dashboard.clerk.com), find the user, and click **Ban user**. This blocks sign-in immediately. The user's data is preserved.
2. **Remove their role** to demote an admin back to subscriber: Use the Subscribers tab and set their role to Subscriber.

**Gap to note:** There is no in-app "suspend without deleting" feature. If you need to prevent a specific user from accessing paid features without banning them, the only in-app lever is to revoke their subscription via Stripe (see [§3](#3-billing-and-payments)).

### How do I delete a user (GDPR / right to erasure)?

User deletion is a two-step process because data lives in two systems: Clerk (identity) and Supabase (wedding data).

> Warning: These steps are permanent. The first SQL statement deletes all wedding data for this user. The second deletes their account. There is no recovery path.

**Step 1 — find the user's Clerk ID:** In the Subscribers tab, find the user. Their Clerk user ID appears if you open the Supabase SQL Editor and run:
```sql
SELECT user_id FROM public.user_roles WHERE user_id LIKE 'user_%' LIMIT 10;
```
Or find the user in [dashboard.clerk.com](https://dashboard.clerk.com) — the user ID is shown on their profile page.

**Step 2 — delete their Supabase data:** In the Supabase SQL Editor (your project → SQL Editor):

```sql
-- Find their wedding ID first
SELECT id FROM public.weddings WHERE user_id = 'user_REPLACE_ME';

-- Delete the wedding (cascades to guests, vendors, tasks, expenses, chat, etc.)
DELETE FROM public.weddings WHERE user_id = 'user_REPLACE_ME';

-- Delete their purchase record (if any)
DELETE FROM public.subscriber_purchases WHERE user_id = 'user_REPLACE_ME';

-- Delete their role record (if any)
DELETE FROM public.user_roles WHERE user_id = 'user_REPLACE_ME';
```

**Step 3 — delete their Clerk account:** Go to [dashboard.clerk.com](https://dashboard.clerk.com), find the user, and click **Delete user**. This removes their ability to sign in and clears their email from Clerk's records.

**Step 4 — confirm with the requester:** Reply to the GDPR request confirming deletion and the date. Log this in your records.

---

## 3. Billing and payments

Eydn uses **Stripe** for all payment processing. All billing operations that can't be done in the admin panel must be done in the [Stripe Dashboard](https://dashboard.stripe.com).

### How do I find a user's billing history?

1. In Stripe Dashboard, go to **Customers** and search by the user's email address.
2. Click their customer record. You'll see all payments, subscriptions, and invoices.

Alternatively, in the Supabase SQL Editor:
```sql
SELECT id, amount, status, plan, stripe_payment_intent_id, stripe_session_id, purchased_at
FROM public.subscriber_purchases
WHERE user_id = 'user_REPLACE_ME'
ORDER BY purchased_at DESC;
```

### How do I issue a refund?

Refunds are done in the Stripe Dashboard — there is no refund button in the Eydn admin panel.

1. In Stripe Dashboard, go to **Payments** and search by the user's email or the payment intent ID (from the `subscriber_purchases` table).
2. Open the payment and click **Refund**.
3. Choose full or partial refund and confirm.

After issuing the refund in Stripe, update the purchase record in Supabase so the user loses access:

```sql
UPDATE public.subscriber_purchases
SET status = 'refunded'
WHERE stripe_payment_intent_id = 'pi_REPLACE_ME';
```

This immediately demotes the user to the free tier. Their data is preserved.

### How do I handle a chargeback?

1. Stripe will notify you by email when a chargeback is filed. Respond through the Stripe Dashboard with any evidence Stripe requests (purchase date, IP, user activity).
2. If the chargeback is lost (Stripe notifies you), update the purchase record to `'refunded'` as above.
3. If the user still has access, revoke it by setting `status = 'refunded'` on their purchase row.

### How do I create a promo code?

The Promo Codes page is at `/dashboard/admin/promo-codes` (left sidebar: **Operations → Promo Codes**).

1. Click **Create Code**.
2. Fill in:
   - **Code** — uppercase alphanumeric, 3–30 characters (e.g., `LAUNCH20`).
   - **Discount type** — Percentage (%) or Fixed amount ($).
   - **Discount value** — e.g., `20` for 20% off, or `15` for $15 off.
   - **Max uses** — leave blank for unlimited.
   - **Expires** — leave blank for no expiry.
   - **Description** — internal note only (e.g., "Launch week partner offer").
3. Click **Create Promo Code**. The code appears in the table immediately.

A 100% discount code lets the user get the $79 Lifetime plan for free (bypasses Stripe entirely). Use this to comp accounts.

To disable a code without deleting it, click **Disable** in the table. You can re-enable it later.

### How do I change a user's plan?

**To upgrade a user from free/trial to paid:** Create a 100% promo code and send it to them, or insert a purchase record directly (see [§2 — comp a Lifetime account](#how-do-i-comp-a-lifetime-account-grant-paid-access-without-charging)).

**To downgrade a paid user to free:** Set their `subscriber_purchases` row to `status = 'refunded'`. This is immediate.

**To cancel a Pro Monthly subscription:** Go to Stripe Dashboard → the user's customer page → their subscription → **Cancel subscription**. Choose whether to cancel immediately or at period end. Then set `status = 'refunded'` on their Supabase row.

**Gap to note:** There is no plan-change UI in the Eydn admin panel. All plan changes require either the Stripe Dashboard or a direct Supabase SQL operation.

---

## 4. Email and communications

For the full email sequence engine — editing templates, adjusting timing, enabling/disabling steps — see **[EMAIL_SEQUENCES.md](EMAIL_SEQUENCES.md)**. That document covers everything about the DB-driven sequence engine in detail. This section covers operational tasks on top of that.

### How do I look up whether a specific email reached a user?

The email tracking table records Resend delivery events (delivered, bounced, complained, clicked).

In the Supabase SQL Editor:
```sql
-- Look up Resend delivery events for a specific email address
SELECT event_type, created_at, metadata
FROM public.email_events
WHERE email_to = 'user@example.com'
ORDER BY created_at DESC
LIMIT 50;
```

For sequence emails specifically (joining to get the template slug):
```sql
-- Find all sequence emails sent to a specific user
SELECT
  ssl.sent_at,
  ssl.sequence_slug,
  ssl.step_order,
  ses.template_slug,
  ssl.recipient_email,
  ssl.resend_email_id
FROM public.sequence_send_log ssl
LEFT JOIN public.email_sequence_steps ses
  ON ses.sequence_slug = ssl.sequence_slug
  AND ses.step_order = ssl.step_order
WHERE ssl.user_id = 'user_REPLACE_ME'
ORDER BY ssl.sent_at DESC;
```

`sequence_send_log` has no `status` column — the presence of a row means "sent successfully." A missing row means either the cron hasn't run yet, the recipient was outside the audience filter, or they had a backfilled skip-row from a sequence rollout (see [EMAIL_SEQUENCES.md §8a](EMAIL_SEQUENCES.md)).

The **Communications** tab in the admin panel (`/dashboard/admin?tab=email`) shows the last 20 lifecycle emails sent across all weddings, along with total counts per template.

### How do I send a one-off test email?

In the Communications tab (`/dashboard/admin?tab=email`), scroll to **Send Test Email**. Enter a recipient address, choose a template from the dropdown, and click **Send Test**. The email arrives with a `[TEST]` banner and uses sample data.

For editing the template content before sending a test, use **Operations → Email Sequences** (see [EMAIL_SEQUENCES.md §4](EMAIL_SEQUENCES.md)).

### How do I send a broadcast email to all users?

There is no broadcast tool in the Eydn admin panel. To send a one-time email to all users or a segment:

1. Export email addresses from Supabase (see below).
2. Send via the **Resend** dashboard at [resend.com](https://resend.com) using Broadcasts, or import into your CRM/email tool.

To export active user emails from Supabase SQL Editor:
```sql
-- All users who have a wedding (active users)
SELECT DISTINCT w.user_id, ep.email
FROM public.weddings w
-- Note: user emails live in Clerk, not Supabase. See Clerk dashboard for email export.
```

**Gap to note:** User email addresses are stored in Clerk, not in Supabase. To get a full export of user emails, go to [dashboard.clerk.com](https://dashboard.clerk.com) → Users → Export. Cross-reference Clerk user IDs with Supabase data as needed.

### How do I handle a user reply to an automated email?

All automated emails are sent from the `from` address configured in the `RESEND_FROM_EMAIL` environment variable (default: `Eydn <hello@eydn.app>`). Replies go to that address. Check that inbox and respond manually.

### How do I unsubscribe someone manually?

The `email_preferences` table controls per-wedding opt-outs. To unsubscribe a user from marketing and nurture emails:

```sql
UPDATE public.email_preferences
SET marketing_emails = false, unsubscribed_all = true, updated_at = now()
WHERE wedding_id = (
  SELECT id FROM public.weddings WHERE user_id = 'user_REPLACE_ME' LIMIT 1
);
```

Setting `unsubscribed_all = true` stops all non-transactional email immediately. Transactional emails (deadline reminders, lifecycle critical notices) are still sent unless you also set `deadline_reminders = false` and `lifecycle_emails = false`.

### Viewing email delivery health

In **Operations → AI & Integrations**, the **Email Delivery Health** section shows sends, bounces, and complaints for the last 7 days, and calculates a delivery rate. A delivery rate below 98% needs investigation in the Resend dashboard.

Go to [resend.com](https://resend.com) → **Emails** to see individual send status. Filter by email address or date to find a specific send.

---

## 5. Cron jobs and background tasks

### What jobs run and when?

All schedules are defined in `vercel.json` and run on Vercel's cron infrastructure (UTC times):

| Job | Schedule | What it does |
|---|---|---|
| `process-trial-conversions` | Every hour | Charges saved cards when trials end |
| `trial-emails` | Daily 14:00 UTC | Sends trial sequence + post-downgrade nurture + calculator follow-up emails |
| `lifecycle` | Daily 04:00 UTC | Wedding phase transitions and post-wedding/milestone emails |
| `check-deadlines` | Daily 09:00 UTC | Task deadline reminder emails |
| `trial-reminders` | Daily 15:00 UTC | 3-day trial expiry reminder emails |
| `trial-downgrade-events` | Daily 06:00 UTC | Records trial downgrade analytics events |
| `backup` | Daily 03:00 UTC | Full data export to Hetzner via SFTP |
| `storage-cleanup` | Sundays 05:00 UTC | Removes orphaned storage files |
| `vendor-reminders` | Mondays 10:00 UTC | Weekly vendor payment reminders |
| `weekly-conversion-report` | Mondays 13:00 UTC | Conversion summary email to admin |
| `indexnow` | Sundays 06:00 UTC | Submits new blog posts to search engines |

### How do I view recent cron history?

Go to `/dashboard/admin?tab=cron-jobs`. You'll see a card per job with:
- Green/red dot — last run status
- Last run time
- Last run duration
- Success/error counts (from the last 50 runs)
- Execution history table with per-run status, duration, and error messages

### How do I manually trigger a cron job?

In the Cron Jobs tab, each job card has a **Run Now** button. Click it. The job runs immediately in the background and the page shows "Running..." until it completes. A toast notification confirms success or failure.

You can also trigger any job from the Vercel Dashboard: go to your project → **Cron Jobs** tab → find the job → **Trigger** (the clock icon).

### How do I diagnose a cron failure?

1. In the Cron Jobs tab, click the failed job's execution row in the history table. The **Details** column shows the error message.
2. For more detail, go to Vercel Dashboard → **Logs** → filter by the cron route (e.g., `/api/cron/backup`). You'll see the full server log output.
3. For the `backup` job specifically: if SFTP is not configured, the job will succeed but note "SFTP not configured" in the details. This is expected if you haven't set the `BACKUP_SFTP_*` environment variables.
4. Common causes:
   - **Auth failure (401):** The `CRON_SECRET` or `BACKUP_SECRET` environment variable is missing or mismatched in Vercel.
   - **Database timeout:** Supabase was briefly unreachable. Re-run the job; it's safe to re-run any of these.
   - **Resend failure:** Check Resend dashboard for API key validity and sending domain status.

### How do I replay a failed job?

All cron jobs are idempotent — safe to re-run. Click **Run Now** in the Cron Jobs tab. For email jobs, the system deduplicates against `sequence_send_log` and `lifecycle_emails`, so re-running will not send duplicate emails to users who already received them.

---

## 6. Incident response

### Where do logs live?

| Log source | What you find there | How to access |
|---|---|---|
| **Vercel Logs** | HTTP request logs, server function errors, cron output | vercel.com → your project → Logs |
| **Sentry** | Application errors with stack traces, browser and server | sentry.io → eydn-app project |
| **Supabase Logs** | Database query logs, auth events, API usage | supabase.com → your project → Logs |
| **Resend** | Email delivery status, bounces, webhooks | resend.com → Emails / Webhooks |
| **Stripe** | Payment events, webhook logs, disputes | dashboard.stripe.com → Developers → Logs |
| **Clerk** | Auth events, sign-in attempts, MFA | dashboard.clerk.com → Logs |

### How do I roll back a bad deploy?

Vercel keeps a full history of every deployment.

1. Go to [vercel.com](https://vercel.com) → your `eydn-app` project → **Deployments**.
2. Find the last known-good deployment (the one before the bad one).
3. Click the three-dot menu → **Promote to Production**.

The rollback is instant. Database migrations are not rolled back automatically — if you deployed a migration alongside the broken code, see your developer for a rollback migration.

### How do I disable a feature in a hurry?

The **Settings** tab in the admin panel (`/dashboard/admin?tab=settings`) has feature flags. Turn off any of these toggles and the change takes effect for all users immediately (no deploy required):

- **AI Chat** — disables the chat assistant entirely
- **Seating Chart** — hides the seating chart feature
- **Day of Planner** — hides the day-of binder / PDF export
- **File Uploads** — blocks all file attachment uploads

To disable new signups (e.g., during a maintenance window):
- Uncheck **Allow new signups** in the Registration section of the Settings tab.
- Or check **Invite only** to require an invite token.

These toggles write to the `app_settings` table in Supabase and are read on every request.

### How do I disable a feature for a single user?

There is no per-user feature flag. Your options:
- If they're an abuser: ban them in Clerk (see [§2](#how-do-i-suspend-or-temporarily-block-a-user)).
- If they're exceeding AI chat limits: increase or decrease the **Max AI chat messages per hour** limit in the Settings tab (this applies to all users).

**Gap to note:** Per-user feature flags do not exist. Building them would require a feature in `user_roles` or a separate table.

### Who to contact for escalation

| Issue | Contact |
|---|---|
| Vercel outage | status.vercel.com |
| Supabase outage | status.supabase.com |
| Stripe outage | status.stripe.com |
| Clerk outage | status.clerk.com |
| Application bug (needs code change) | The dev team via GitHub Issues |
| Security incident | security@eydn.app (see SECURITY.md) |

---

## 7. Monitoring

### What is currently monitored?

| Tool | What it monitors | Alerts |
|---|---|---|
| **Sentry** | Application errors (JS exceptions, API failures, cron errors) | Email on new issues; spikes trigger alert rules |
| **Vercel Analytics** | Web vitals, page performance, function error rates | Vercel dashboard only; no proactive alerts by default |
| **Resend webhooks** | Email bounces, complaints, delivery failures | Logged to `email_events` table; visible in AI & Integrations tab |
| **Admin Cron Jobs tab** | Job success/failure history for last 50 runs | No proactive alert — check the tab manually |
| **Supabase** | Database health, connection counts, storage | Supabase dashboard; Pro plan includes basic alerting |

**What is not monitored (gaps):**
- No uptime monitor is wired up by default. If you want "page is down" alerts, set up [UptimeRobot](https://uptimerobot.com) or [Better Uptime](https://betterstack.com) against `https://eydn.app` and your Hetzner/Coolify-hosted services (n8n at `https://auto.asymmetric.pro`, Matomo at `https://analytics.asymmetric.pro`).
- No proactive cron failure alert. If a cron silently stops running, you'll only notice when you look at the Cron Jobs tab.

### What alerts to expect vs. ignore

**Expected (not actionable):**
- Sentry: "NEXT_REDIRECT" — this is a normal Next.js redirect, not an error.
- Resend: occasional `complained` events — one or two per week is normal. More than 0.1% of sends is actionable.
- Cron: `storage-cleanup` and `indexnow` run weekly and may show gaps in the daily view.

**Actionable:**
- Sentry: any new issue with 10+ occurrences in a day.
- Resend: delivery rate dropping below 98%, or more than 2 complaint events in a day.
- Vercel: function error rate above 1% for more than 10 minutes.
- Cron: `process-trial-conversions` failing (runs hourly — this delays Stripe charges). `lifecycle` or `trial-emails` failing (users miss emails).

---

## 8. User support workflows

### "The user says they didn't receive email X"

1. Ask the user for the email address they signed up with.
2. Check the `sequence_send_log` table (see [§4 — looking up whether an email reached a user](#how-do-i-look-up-whether-a-specific-email-reached-a-user)).
3. Check `email_events` for a bounce or complaint event on that address.
4. If the send log shows the email was sent but `email_events` shows a bounce, the user's mail server rejected it. Ask them to check spam and whitelist `hello@eydn.app`.
5. If the send log has no row for that email type and wedding, the cron job hasn't run yet or the user was already in `sequence_send_log` from a backfill. Check the cron history for the relevant job.
6. For the full decision tree, see [EMAIL_SEQUENCES.md §9 — troubleshooting a missing send](EMAIL_SEQUENCES.md).

### "The user says their data is missing"

Deleted records are soft-deleted, not immediately destroyed. Users can self-restore from **Settings → Recently Deleted** within 30 days.

If it's been more than 30 days, or the record isn't in the soft-delete list:

1. Check the `activity_log` table to confirm what happened:
```sql
SELECT action, entity_type, entity_name, created_at
FROM public.activity_log
WHERE wedding_id = (
  SELECT id FROM public.weddings WHERE user_id = 'user_REPLACE_ME'
)
ORDER BY created_at DESC
LIMIT 100;
```
2. If the data was permanently deleted and the backup ran, you may be able to recover it from the Hetzner SFTP backup (daily JSON export). The file is at `/backups/eydn/eydn-backup-YYYY-MM-DD.json`.
3. Supabase Pro plan includes 7-day Point-in-Time Recovery (PITR). Contact Supabase support to restore a specific table to a point before the deletion.

### "The user wants to delete their account"

This is the GDPR right-to-erasure flow. Follow the steps in [§2 — delete a user](#how-do-i-delete-a-user-gdpr--right-to-erasure).

### "The user wants their guest list exported"

There is no self-serve guest list export in the app. You can export it from Supabase on their behalf:

```sql
SELECT
  g.first_name,
  g.last_name,
  g.email,
  g.phone,
  g.rsvp_status,
  g.dietary_restrictions,
  g.plus_one,
  g.side,
  g.notes
FROM public.guests g
JOIN public.weddings w ON w.id = g.wedding_id
WHERE w.user_id = 'user_REPLACE_ME'
  AND g.deleted_at IS NULL
ORDER BY g.last_name, g.first_name;
```

Copy the results to a spreadsheet and send it to the user. For GDPR export requests, include all tables mentioned in [§2 — delete a user](#how-do-i-delete-a-user-gdpr--right-to-erasure) (wedding data, chat messages, activity log, purchase records).

---

## 9. Routine maintenance calendar

### Monthly

- **Review promo codes:** Go to `/dashboard/admin/promo-codes` and disable any codes that have expired or reached max uses but weren't auto-expired (codes with `expires_at` disable automatically; codes with only `max_uses` do not auto-disable).
- **Check email delivery rate:** Look at the AI & Integrations page and Resend dashboard. Bounce rate above 2% needs list hygiene action.
- **Review Sentry backlog:** Close or resolve issues that have been fixed. Set up alert rules for any new issue patterns you notice.

### Quarterly

- **Rotate secrets:** Rotate `CRON_SECRET`, `BACKUP_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables. Update them one at a time so the running app always has a valid key. See [SECURITY.md](SECURITY.md) for the full secret inventory.
- **Verify backup:** Download the latest backup file from the Hetzner server (`/backups/eydn/eydn-backup-YYYY-MM-DD.json`), open it, and confirm it contains wedding records with guest data. You can trigger a manual backup from the **Data & Security** tab and verify the toast message shows a non-zero wedding count.
- **Verify Cadence sync:** In the Leads page, sort by date and confirm recent calculator submissions show **Cadence ✓**. A streak of "Cadence failed" or "Cadence pending" badges means the env var is missing or Cadence is rejecting requests — verify `CADENCE_URL` and `CADENCE_NEWSLETTER_FORM_ID` in Vercel and check the Cadence dashboard.
- **Review admin users:** Go to the Subscribers tab, filter by **Admins**. Remove admin role from anyone who no longer needs it.
- **Check Clerk dashboard:** Review active sessions and look for any accounts with unusual behavior.

### TLS / certificate renewals

Vercel manages TLS certificates for `eydn.app` automatically — no action required.

For your Hetzner/Coolify-hosted services (n8n at `auto.asymmetric.pro`, Matomo at `analytics.asymmetric.pro`): Coolify manages Let's Encrypt certificates automatically via its reverse proxy. Verify in the Coolify dashboard at [app.coolify.io](https://app.coolify.io) that the SSL status for each service shows "Valid". Coolify auto-renews 30 days before expiry.

### Dependency bumps

The repo's CI pipeline flags when the shared JavaScript bundle exceeds 280 KiB gzip. When a dependency upgrade is needed, your developer handles it. As operator, your job is to review the Vercel deploy preview for any regressions before promoting to production.

---

## 10. Waitlist and growth ops

### How do I view and manage the waitlist?

Go to `/dashboard/admin/waitlist` (left sidebar: **Operations → Waitlist**). You'll see:
- Total signups
- How many received a discount code
- How many are pending

The list shows each person's name, email, whether their discount code was sent, and when they signed up.

To export: click **Export CSV** at the bottom of the page.

**Note:** The `discount_code_sent` column is a flag you set manually in Supabase — there is no one-click "send code" button in the UI. To mark someone as sent after you've emailed them:

```sql
UPDATE public.waitlist
SET discount_code_sent = true
WHERE email = 'user@example.com';
```

### How do I view leads and export them?

Go to `/dashboard/admin/leads` (left sidebar: **Operations → Leads**). This page aggregates leads from two sources:
- **Waitlist** — people who signed up on the beta waitlist
- **Budget Calculator** — people who saved a budget calculation (includes their state, budget range, and guest count)

You can filter by source and search by name, email, or details. Click **Export CSV** to download the current filtered view.

### Cadence newsletter sync status

Each calculator lead also shows a **Cadence** column with one of three states:

| Badge | Meaning | Action |
|---|---|---|
| **Cadence ✓** | Synced successfully to the Cadence newsletter list | None |
| **Cadence pending** | Sync hasn't completed yet (rare — usually finishes within seconds) | If still pending after a few minutes, check Cadence dashboard |
| **Cadence failed** | Sync errored. Hover the badge to see the error message. | Most common cause is a missing `CADENCE_NEWSLETTER_FORM_ID` env var — verify in Vercel |

Newsletter and quiz signups also push to Cadence but their per-row status isn't currently surfaced in the admin UI (only calculator leads have a destination row to record on). To verify those flows end-to-end, check the Cadence list directly.

### How do I send beta invites?

Eydn has no in-app "send invite" flow. The current process is:

1. Create a promo code for the invitee (e.g., `BETA-INVITE` at 100% discount) in `/dashboard/admin/promo-codes`.
2. Send an email manually from your email client with the signup link (`https://eydn.app/sign-up`) and the promo code.
3. When they sign up and use the code, grant them the `beta` role in the Subscribers tab so they have permanent full access without needing to pay.

Alternatively, if you want to give someone permanent free access without the promo flow, just set their role to **Beta** directly in the Subscribers tab after they've signed up.

### How do I turn invite-only mode on or off?

In the Settings tab (`/dashboard/admin?tab=settings`), under **Registration**:
- Check **Invite only** to require an invite token for new signups.
- Uncheck **Allow new signups** to close signups entirely.

---

## 11. Vendor directory management

Eydn does not charge vendors for inclusion or placement. The directory shown to couples (`/dashboard/vendors/directory`) is sourced six ways, all of them under your control as admin:

| Source | Where rows come from | Stamped as |
|---|---|---|
| **Auto-import from scraper** | The hourly cron pulls new vendors from your external scraper's Supabase, applies quality rules, and inserts qualifying rows automatically | `seed_source = 'scraper_auto'` |
| **Places API seeder** | A scheduled cron pulls businesses from Google Places for category × city combinations you configure | `seed_source = 'places_api'` |
| **CSV import** | You upload a spreadsheet of vendors via the admin UI | `seed_source = 'csv'` |
| **External Supabase import** | The "Import from Supabase" button pulls vendors from a separate Supabase instance (e.g. an out-of-app data pipeline you maintain elsewhere). Dedupes on (name, city, state). | `seed_source` not auto-stamped — set the optional **Source label** field on the import form for an audit hint, or leave NULL |
| **Manual entry** | You add a vendor one-at-a-time via the admin form | `seed_source = 'manual'` (or NULL for legacy rows) |
| **Couple submissions** | A couple submits a vendor; you click Approve; it auto-promotes | `seed_source = 'submission'` |

All six land in the `suggested_vendors` table.

> **Internal quality score:** the `quality_score` column is an admin-only ranking signal (numeric, no fixed range — typically 0–100). The Supabase importer maps the remote `score` column to it by default; the CSV importer accepts a `quality_score` column; admins can edit it per-vendor in the edit modal. **It is excluded from the couple-facing API response** (`/api/suggested-vendors`) so it never leaks into the directory UI. Use it to sort the admin Directory tab via the "Score: high → low" sort dropdown — useful for prioritizing curation effort or pruning low-score rows. You can audit a row's origin by reading the `seed_source` column in Supabase, or by the `import_source` text field that the Supabase importer writes per batch.

### How does the auto-import from the scraper work?

An hourly cron (`/api/cron/import-vendors`) pulls new vendor rows from your external scraper's Supabase, applies Eydn's quality rules, and either inserts qualifying rows into `suggested_vendors` or logs them to `vendor_import_rejections` for admin review.

**What you set in Vercel (one-time, env vars):**
| Var | Value | Purpose |
|---|---|---|
| `SCRAPER_SUPABASE_URL` | The scraper's Supabase project URL (`https://xxxxx.supabase.co`) | Where to read vendors from |
| `SCRAPER_SUPABASE_KEY` | The scraper project's `service_role` key | Read access to its `vendors` table |
| `SCRAPER_EYDN_CLIENT_ID` | The scraper's `client_id` UUID for Eydn's tenant | Multi-tenant filter |

If any of these are missing, the cron no-ops gracefully and returns a note to that effect — the schedule stays enabled but nothing imports. Set all three before expecting data to flow.

**Quality rules** (in `src/lib/vendors/quality.ts`):
- `quality_score` ≥ 35 (out of 100)
- Street address (`street`) populated
- Phone populated
- Website populated

A vendor missing any of those gets logged to `vendor_import_rejections` with the failed-rule reasons. Admins review on the Places Seed tab → **Auto-import rejections** section.

**The cron is idempotent.** Each scraper row's `id` is stamped onto the imported `suggested_vendors` row (`scraper_id` column) and onto rejection rows. The cron skips any scraper id already in either table, so re-runs don't double-process and don't re-evaluate decisions you've made.

### How do I review and override import rejections?

On `/dashboard/admin/vendors` → **Places Seed** tab → **Auto-import rejections** card at the top.

Each rejected vendor shows: name, category, city/state, scraper score, the failed rules (in red), and a collapsible "details" section with phone, website, email, street, full description, and the scraper id.

To promote a rejected vendor anyway: click **Override + Add**. The system:
1. Inserts the vendor into `suggested_vendors` with `manually_approved = true` and `seed_source = 'scraper_auto'`
2. Stamps `overridden_at` + `overridden_by` (your Clerk user ID) on the rejection row for audit
3. Future cron runs see the row in `suggested_vendors.scraper_id` and skip it — it won't get re-rejected

The `manually_approved` flag is honored by the quality checker: if the same vendor is re-imported (e.g. after deletion + re-fetch), the quality rules are bypassed.

**Filter the rejections list** by status: `Pending review` (default), `Overridden`, or `All`. Shows up to 200 rows.

### How do I change the quality thresholds?

Edit `QUALITY_RULES` in `src/lib/vendors/quality.ts` (a developer task, not admin-editable). Current rules:
- `minScore: 35`
- `requireStreetAddress: true`
- `requirePhone: true`
- `requireWebsite: true`

Thresholds are deliberately code-only because they're product decisions tied to brand position; if they start changing weekly, move them to a `quality_rules` config table.

### How do I configure the Places API seeder?

Go to `/dashboard/admin/vendors`, click the **Places Seed** tab.

The page shows three things:

1. **Today's API spend** — a card at the top showing how many cost units you've used today versus your daily cap. The cap defaults to 200 cost units (~25 textSearch calls) and is set via the `PLACES_API_DAILY_CAP` env var in Vercel. When the cap is hit, both the cron and "Run now" buttons stop until UTC midnight.

2. **Add config form** — pick a category, type a city, pick a state, and set how many results you want (max 60). The cron will pull that many businesses from Google Places for that combination on its next run.

3. **Configs table** — every config you've added, with last/next run times, the count from its last run, any error, and per-row controls:
   - **Run now** — triggers a single run immediately (subject to the daily cap)
   - **Toggle on/off** — pauses a config without deleting it
   - **Del** — removes the config (already-seeded vendors stay in the directory)

The cron itself runs **Sundays at 02:00 UTC**, picks up every enabled config whose `next_run_at` has passed, and re-runs them. After each run, `next_run_at` is set to 30 days out — so each config refreshes monthly by default.

> Cost guidance: at the default cap, you can seed roughly 25 cities-per-category per day (each call returns up to 20 vendors). Bulk-seeding a new market is a "raise the cap temporarily" exercise: bump `PLACES_API_DAILY_CAP` to 1000 in Vercel, run a batch via "Run now", then drop it back. Verify spending against the [Google Cloud Console billing page](https://console.cloud.google.com/billing) — the cost units are an internal approximation, not the authoritative dollar figure.

### How do I import from an external Supabase instance?

The **Import from Supabase** button on the Directory tab pulls rows from any reachable Supabase project's `vendors`/`suggested_vendors`/`businesses` table into the local directory. This is the path used to ingest data from any out-of-app vendor pipeline you maintain (a separate Supabase project, a partner-supplied database, etc.) — the importer is a manual, admin-triggered pull. There is no scheduled job, no webhook, no shared credential.

#### What it does end-to-end

1. **Connects** to the remote Supabase project using the URL + service role key you supply. The URL must end in `.supabase.co` (the importer rejects anything else).
2. **Reads** up to 5,000 rows from the table you name, optionally filtered by one column = value pair you supply.
3. **Maps** remote columns to the local schema. Defaults assume the remote columns are named `name`, `category`, `city`, `state`, `website`, `phone`, `email`, `address`, `zip`, `country`, `description`, `price_range`. If your remote schema uses different names, supply a column map (currently only via direct API call; not surfaced in the admin UI form).
4. **Normalizes** each row in transit (see normalization rules below).
5. **Drops invalid rows** — anything missing `name`, `category`, `city`, or `state`, or with a state that can't resolve to a 2-letter code.
6. **Dedupes** against existing `suggested_vendors` on lowercased `(name, city, state)`. Existing rows are **never overwritten**.
7. **Stamps** every newly-inserted row with `imported_at` (timestamp) and `import_source` (your Source label, or the remote URL if blank).
8. **Inserts** in batches of 100. A failed batch doesn't block subsequent batches; per-batch errors are returned in the response.

#### Step-by-step

1. Go to `/dashboard/admin/vendors`, **Directory** tab. Click **Import from Supabase**.
2. Fill in:
    - **Supabase URL** — the source project's URL (e.g. `https://xxxxx.supabase.co`)
    - **Service role key** — for read access to the source table. Get it from the source project's Supabase dashboard → Project Settings → API → `service_role` secret.
    - **Table name** — defaults to `vendors`. Other allowed values: `suggested_vendors`, `businesses`. The allowlist is hardcoded for safety; other names are rejected.
    - **Filter column / value** — optional. For partial pulls (e.g. only `status='active'` rows, or only `state='TX'`).
    - **Source label** — free-text tag stamped on each imported row's `import_source` field. Set it meaningfully — e.g. `"florists batch 2026-04-26"` — so you can later query "which rows came from this batch?"
3. Click **Dry run** first. The response shows:
    - `total_remote` — how many rows the source returned
    - `valid` — how many passed normalization
    - `skipped_invalid` — how many were dropped (missing required fields, unresolvable state, etc.)
    - `duplicates` — how many already exist in your directory
    - `would_import` — net new rows that would be inserted
    - `preview` — the first 10 rows that would be inserted
4. If `would_import` looks right and the preview has the right shape, click **Import for real**.

#### What gets normalized in transit

| Field | Rule |
|---|---|
| **Category** | Aliases collapse to the 13-category enum. `"photography"` / `"wedding photographer"` / `"photo/video"` → `"Photographer"`. Unrecognized values pass through unchanged (and may need an admin edit later). |
| **State** | `"texas"` / `"Tx"` / `"TX"` → `"TX"`. Unresolvable values → row dropped as invalid. |
| **City** | Title-cased and trimmed. |
| **Phone** | Standardized format regardless of input style. |
| **Website** | Protocol added if missing; trailing slash stripped. |
| **Email** | Lowercased and trimmed. |
| **Price range** | Mapped to `$`/`$$`/`$$$`/`$$$$` if possible; null otherwise. |
| **Country** | Defaults to `"US"` if missing. |

#### Operational notes

- **5,000-row cap per call.** If your source has more rows, split via the Filter column/value field — e.g. import `state='TX'` first, then `state='CA'`, etc.
- **Synchronous, foreground request.** Large imports take 30+ seconds and the admin UI sits on it. No background job, no progress bar.
- **Sensitive payload.** The service role key is sent over HTTPS to your Vercel function and then to the remote Supabase. **If a server error happens during the request, the key may end up in Vercel error logs.** Treat the import action as elevated; rotate the source-side service role key periodically (quarterly is fine).
- **No `seed_source` stamp.** This pipeline pre-dates the `seed_source` column; rows are stamped via the older `imported_at` / `import_source` columns instead. To backfill `seed_source = 'external_supabase'` on imported rows, run:
  ```sql
  UPDATE public.suggested_vendors
  SET seed_source = 'external_supabase'
  WHERE imported_at IS NOT NULL AND seed_source IS NULL;
  ```
- **Failed dry run with `would_import = 0`** means everything in the source already exists in your directory (dedup match). To force an update of existing rows, you'd need to delete them first via SQL or the Directory tab — the importer never overwrites.

#### Auditing later

To find every row imported by a particular batch:
```sql
SELECT id, name, category, city, state, imported_at, import_source
FROM public.suggested_vendors
WHERE import_source = 'florists batch 2026-04-26'
ORDER BY name;
```

To find every batch label that's been used:
```sql
SELECT import_source, COUNT(*) AS rows, MAX(imported_at) AS last_imported
FROM public.suggested_vendors
WHERE imported_at IS NOT NULL
GROUP BY import_source
ORDER BY last_imported DESC;
```

### How do I bulk-import vendors from a CSV?

On the **Places Seed** tab there's a CSV import card at the top. Steps:

1. Prepare a CSV with these required columns: `name`, `category`, `city`, `state`. Optional columns: `country`, `zip`, `website`, `phone`, `email`, `address`, `description`, `price_range` (must be `$`/`$$`/`$$$`/`$$$$`), `gmb_place_id`.
2. Click "Choose file" and select the CSV.
3. Click **Dry run** — the system parses the file, validates each row, dedups against existing vendors, and shows you a summary: rows parsed, valid, invalid (with errors), how many would be inserted, how many would be matched as duplicates.
4. If the summary looks right and the invalid count is zero, click **Commit import**. New rows are inserted; existing rows are not overwritten (admin must edit individually if they want to update copy).

**Dedup rules:** rows with a `gmb_place_id` are matched first against existing place IDs. Rows without a place ID are matched on lowercase (name + city + state). Both insert and update behavior is non-destructive — never overwrites an existing row's fields.

**File limits:** 5 MB max. Anything bigger should be split into batches.

### How do I review couple-submitted vendors?

On `/dashboard/admin/vendors`, **Submissions** tab. Each pending submission shows the suggested name, category, city, state, and submission date. Two buttons per row:

- **Approve** — sets the submission status to approved AND inserts a corresponding row into `suggested_vendors` with `seed_source = 'submission'`. The vendor appears in the couple-facing directory immediately. Approved is the right choice if the submission is real and the basic info is plausible.
- **Reject** — sets status to rejected. Nothing is added to the directory. Use for spam, duplicates, or businesses that don't fit Eydn's category list.

Approval does not currently send a notification back to the submitter — that's a planned enhancement.

### How do I edit or remove a vendor from the directory?

On the **Directory** tab, each vendor row has:

- **Featured toggle** — pinned to the top of search results when on
- **Active toggle** — visible to couples when on; soft-hide by turning off (the row stays in the database)
- **Edit** — change name, category, copy, contact info
- **Delete** — permanent removal

For bulk operations (deactivate everything in a category, etc.), use SQL via the Supabase dashboard.

### Watch-outs

1. **Auto-imported vendors land active by default.** This is intentional — manual approval-per-row would gate growth on admin attention. Spot-check the Directory tab after big seed runs and toggle off anything obviously wrong (closed businesses, wrong category, irrelevant types like a Verizon store showing up under "Photographer").

2. **CSV imports do not refresh existing rows.** If you upload a CSV that includes a vendor already in the directory, the row is skipped (counted as duplicate). To bulk-update vendor copy, you'd need to delete the old rows first, or do the update via SQL.

3. **The Places API seeder pulls basic info only** (name, address, phone, website, place ID). Reviews, photos, and full GMB data are pulled on-demand when a couple opens a vendor card. This keeps per-row seeding cheap (~$0.04 per call instead of ~$0.10 with full details).

4. **`PLACES_API_DAILY_CAP` is a soft cap.** It's enforced by querying `places_api_usage_log` before each call. If two cron runs trigger simultaneously, both could squeak through before either logs. In practice this never happens — the cron is single-threaded — but if you trigger many "Run now" actions in parallel from the admin UI, expect minor overage.

5. **Do not edit `seed_source` after the fact.** It's an audit trail of where the row came from, not a control flag. The runner doesn't read it; admin curation goes through the per-row featured/active toggles instead.

**Note:** Invite-only mode is a flag but there is no invite-token generation UI — this setting paired with manual outreach is the intended workflow for beta periods.
