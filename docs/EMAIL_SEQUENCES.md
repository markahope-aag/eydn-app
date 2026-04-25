# Email Sequences — Admin Guide

How the Eydn email sequence engine works, what's currently shipped, and how to maintain it without a code deploy.

> Companion to `COMMUNICATIONS.md` (which covers all communication channels). This doc focuses on the new DB-driven email engine introduced April 2026.

---

## 1. The 30-second model

There are three things to keep in your head:

1. **Templates** — one row per email. Subject + HTML body + which template variables it uses + a category (transactional / lifecycle / marketing / nurture). Stored in `email_templates`.
2. **Sequences** — an ordered series of steps. Each step references a template and a day-offset from an "anchor date". Stored in `email_sequences` + `email_sequence_steps`.
3. **The runner** — a cron job loads a sequence, computes which steps are due for each recipient, dedups against `sequence_send_log`, renders the template, and sends via Resend.

Because all three live in the database, **you can change template copy, retime a step, or disable a sequence without a code deploy**. Code only changes when you need a new *trigger event* (the kind of thing that anchors a sequence — see §6 for what's wired up).

---

## 2. Where to find things

| Thing | Location |
|---|---|
| Admin UI | `/dashboard/admin/email-sequences` (sidebar: Operations → Email Sequences) |
| Templates table | `email_templates` |
| Sequences table | `email_sequences`, `email_sequence_steps` |
| Send log (dedup + audit) | `sequence_send_log` |
| Runner code | `src/lib/email-sequences.ts` |
| Theme tokens (palette + wrapper) | `src/lib/email-theme.ts` |
| Trial cron | `src/app/api/cron/trial-emails` (runs daily 14:00 UTC) |
| Lifecycle / wedding-date cron | `src/app/api/cron/lifecycle` (runs daily 04:00 UTC) |
| Send provider | Resend (single seam: `sendEmail()` in `src/lib/email.ts`) |

---

## 3. What's currently shipped

### Sequence: `trial_expiry`
**Trigger:** `trial_started` (anchor = `weddings.trial_started_at`, falls back to `created_at`)
**Audience:** all weddings without an active subscription. Per-step `has_card_saved` filter splits day-14 between renewal-notice vs downgrade-notice.

| Step | Day | Audience | Template |
|---:|---:|---|---|
| 10 | 10 | no card | `trial_day_10_save_card` |
| 11 | 11 | no card | `trial_day_11_vendor_question` |
| 12 | 12 | no card | `trial_day_12_why_we_charge` |
| 13 | 13 | no card | `trial_day_13_last_day` |
| 14 | 14 | has card | `trial_day_14_renews_today` |
| 15 | 14 | no card | `trial_day_14_downgraded` |

### Sequence: `post_downgrade_nurture`
**Trigger:** `trial_downgraded` (anchor = trial_end = `trial_started_at + 14 days`)
**Audience:** weddings with no active subscription AND no card on file. Honors `marketing_emails` opt-out.

| Step | Days post-downgrade | Template |
|---:|---:|---|
| 1 | +3 | `downgrade_d17_free_tier_intro` |
| 2 | +6 | `downgrade_d20_three_things` |
| 3 | +7 | `downgrade_d21_vendor_secret` |
| 4 | +11 | `downgrade_d25_one_month_in` |
| 5 | +16 | `downgrade_d30_check_in` |
| 6 | +31 | `downgrade_d45_planning_phase` |
| 7 | +46 | `downgrade_d60_two_months` |
| 8 | +76 | `downgrade_d90_coordination` |

### Sequence: `wedding_milestones`
**Trigger:** `wedding_date` (anchor = `weddings.date`)
**Audience:** every wedding with a date set. Honors `marketing_emails` opt-out.

| Step | Offset (days) | When | Template |
|---:|---:|---|---|
| 1 | -547 | 18 months out | `milestone_18mo` |
| 2 | -365 | 12 months out | `milestone_12mo` |
| 3 | -274 | 9 months out | `milestone_9mo` |
| 4 | -183 | 6 months out | `milestone_6mo` |
| 5 | -91 | 3 months out | `milestone_3mo` |
| 6 | -30 | 1 month out | `milestone_1mo` |
| 7 | -14 | 2 weeks out | `milestone_2wk` |
| 8 | -7 | 1 week out | `milestone_1wk` |
| 9 | +7 | 1 week post | `milestone_post7d` |

### Sequence: `wedding_lifecycle`
**Trigger:** `wedding_date` (anchor = `weddings.date`, post-wedding only)
**Audience:** weddings whose date has passed. Honors `marketing_emails` opt-out for upsell steps.

This is the post-wedding archival flow (1mo / 6mo / 9mo download reminders, memory plan offer, archive notice, sunset warnings). Pre-existing — moved into the new engine in April 2026 with no behavior change.

---

## 4. Editing a template

1. **Open the admin UI:** `/dashboard/admin/email-sequences`
2. Find the template in the **Templates** table at the bottom (or click the template name in any sequence step).
3. Click **Edit** → modal opens with subject + HTML body + enabled toggle.
4. **Use `{{varName}}` placeholders** for dynamic content. Available variables depend on the template — they're listed in the modal header. The most common ones are:
    - `{{firstName}}` — recipient's first name (or "there")
    - `{{partnerNames}}` — escaped "Alice & Bob"
    - `{{weddingDate}}` — formatted "June 15, 2026"
    - `{{endsOn}}` — formatted trial end date
    - `{{appUrl}}` — base URL (e.g. `https://eydn.app`)
    - `{{cardDescription}}` — for renewal emails
5. **Don't include the email header/footer** — the runner adds those automatically (gradient header with logo + CAN-SPAM-compliant footer). You're only editing the body.
6. **Send a test** — type any email address (or leave blank to send to your own admin email) and click **Send test**. Renders against sample data with a `[TEST]` banner.
7. **Save** — changes take effect on the next cron run (within 24h).

### Live preview

The modal has a collapsible **Live preview** that renders the body inside a plain card (no chrome). This is fast, but it doesn't show the gradient header or footer — for the full visual, use **Send test**.

---

## 5. Editing a sequence step

In the sequence card, each step has inline editable fields:

- **Offset (days)** — days from the anchor date. Negative = before (used by pre-wedding milestones), positive = after.
- **Status** — checkbox; uncheck to disable just this step (the rest of the sequence keeps running).

Changes show a **Save** button only when edits are pending. Save triggers a single PATCH request and reloads the page.

To **swap which template a step uses** or **change the audience filter**, you currently need to do it via SQL (the runner supports it; the UI just doesn't expose those fields yet). Example:

```sql
update email_sequence_steps
set template_slug = 'new_template_slug',
    audience_filter = '{"has_card_saved": true}'::jsonb
where sequence_slug = 'trial_expiry' and step_order = 14;
```

---

## 6. Adding a new sequence

If you want a brand-new sequence triggered by something the runner already knows about (`trial_started`, `trial_downgraded`, `wedding_date`), you can do it entirely in SQL — no code change.

```sql
-- 1. Create the templates
insert into email_templates (slug, category, description, subject, html, variables) values
  ('my_new_email_1', 'nurture', 'desc', 'Subject 1', '<h2>Body 1</h2>', array['firstName']),
  ('my_new_email_2', 'nurture', 'desc', 'Subject 2', '<h2>Body 2</h2>', array['firstName']);

-- 2. Create the sequence
insert into email_sequences (slug, description, trigger_event, audience_filter) values
  ('my_new_sequence', 'My new sequence', 'wedding_date', '{}'::jsonb);

-- 3. Create the steps
insert into email_sequence_steps (sequence_slug, step_order, template_slug, offset_days) values
  ('my_new_sequence', 1, 'my_new_email_1', -100),
  ('my_new_sequence', 2, 'my_new_email_2', -50);

-- 4. CRITICAL: backfill skip rows for existing weddings so you don't blast
-- historical recipients (see §8 — Backfill watch-out).
insert into sequence_send_log (sequence_slug, step_order, user_id, wedding_id, recipient_email, sent_at)
select 'my_new_sequence', step.step_order, w.user_id, w.id, NULL, now()
from weddings w cross join email_sequence_steps step
where step.sequence_slug = 'my_new_sequence' and w.user_id is not null
on conflict do nothing;

-- 5. Add the runSequenceForRecipient call to the appropriate cron route.
-- For wedding_date trigger, that's src/app/api/cron/lifecycle/route.ts.
-- For trial_started or trial_downgraded, src/app/api/cron/trial-emails/route.ts.
```

If you need a brand-new **trigger event** (e.g. `vendor_booked`, `task_overdue_3d`), you also have to write a new cron route that resolves the anchor date for that event and calls `runSequenceForRecipient`. That's the only step that requires a code deploy.

---

## 7. Disabling a sequence (or a single template)

Three knobs, each at a different scope:

| To stop... | Toggle | Where |
|---|---|---|
| All sends from one template | `email_templates.enabled = false` | Edit template → uncheck Enabled |
| Just one step in a sequence | `email_sequence_steps.enabled = false` | Sequence card → uncheck step status |
| An entire sequence | `email_sequences.enabled = false` | SQL only (UI exposure pending) |

The runner skips disabled rows silently — no rows get written to `sequence_send_log`, and the cron output reports them as `skippedAudience`/`skippedAlreadySent`.

---

## 8. Watch-outs

### 8a. Backfill before launching a new sequence
**This is the single most important rule.** When you add a new sequence, every existing wedding becomes "due" for every step at once. Without protection, the next cron run sends the entire sequence to everyone at midnight.

**Always run the backfill INSERT in §6 step 4** in the same migration that creates the sequence. It writes a `sequence_send_log` row for every existing recipient × step combination, marking them as "already sent" so they get nothing. Only weddings created *after* that migration run get the sequence.

This is how the April 2026 launch of `post_downgrade_nurture` and `wedding_milestones` was rolled out without an email blast (see `20260425110100_email_skip_backfill_existing.sql`).

### 8b. Categories drive the footer
The runner picks the email footer based on `email_templates.category`:

- `transactional`, `lifecycle` → minimal footer (just the company address)
- `marketing`, `nurture` → CAN-SPAM footer with unsubscribe link

If you mark a marketing email as `transactional`, **it won't have an unsubscribe link** and you'll be out of CAN-SPAM compliance. Categorize honestly.

The runner also automatically skips marketing/nurture sends if the recipient has unsubscribed (`marketing_emails = false` or `unsubscribed_all = true` in their `email_preferences`).

### 8c. Templates store the body only
Don't paste a full `<html>...<body>...</body></html>` blob into the HTML editor. The runner wraps the body with the canonical Eydn shell (gradient header with logo + footer). If you double-wrap, the email breaks.

If you need to change the wrapper itself (logo, gradient, footer base text), edit `src/lib/email-theme.ts` — that requires a code deploy because chrome is brand-locked.

### 8d. Mustache only — no logic
Templates support `{{varName}}` substitution and nothing else. No conditionals, no loops, no formatting helpers. If you need branching (e.g. "show this paragraph only if the user has a card"), make two templates and split them with an `audience_filter` on the steps.

Variables that aren't passed in render as empty strings, so a typo in the placeholder name silently produces a missing word — proofread by sending yourself a test.

### 8e. Don't change a template's slug after it ships
Sequence steps reference templates by slug. Renaming a slug breaks the foreign key. If you really need a new name, create a new template with the new slug and PATCH the affected steps to point at it (or do it via SQL).

### 8f. Send-test uses sample data, not the recipient's data
The "Send test" button in the admin UI renders against fixed sample values (`Sam`, `June 15, 2026`, etc.) — it's a smoke test for the template's *layout*, not its personalization. The real cron run pulls live data from the recipient's wedding row.

### 8g. Mid-trial users may catch up multiple emails
The April 2026 expansion of `trial_expiry` (adding days 11/12/13) wasn't backfilled because the trial window is short (5 days). A user currently on day 12 will get day 11 + day 12 emails on the same cron run. This is a one-time effect that bleeds out within ~5 days of any future expansion to `trial_expiry`. For longer sequences, always backfill (see 8a).

### 8h. Legacy mirror tables still exist
The runner writes to `sequence_send_log` (the new source of truth), but for the trial + post-wedding lifecycle sequences it *also* writes to the old `trial_email_log` and `lifecycle_emails` tables so the existing admin Communications stats keep working. This is transitional. Don't read from the old tables in new code — they're scheduled to be dropped once the admin reads off `sequence_send_log` directly.

---

## 9. Debugging a missing send

> "User X said they didn't get the day-13 email."

1. **Was the cron run at all that day?** `select * from cron_logs where job_name = 'trial-emails' order by started_at desc limit 5;` — confirm it ran successfully.
2. **Did they have a wedding row?** `select id, user_id, trial_started_at, created_at from weddings where user_id = 'user_xxx';`
3. **Was their trial in the candidate window?** Trial-emails cron looks 95 days back from `created_at`. If the wedding row was created more than 95 days ago, they're outside the window.
4. **Was a competing send already logged?** `select * from sequence_send_log where user_id = 'user_xxx' order by sent_at desc;` — if there's a row for this step, the runner thinks it already sent (could be a successful send to a stale address, or a backfilled skip row).
5. **Did the audience filter exclude them?** `trial_day_13_last_day` requires `has_card_saved = false`. If they saved a card, the runner correctly skipped this step.
6. **Are they paid?** Active `subscriber_purchases` row → trial-emails cron skips them entirely.
7. **Did Resend bounce it?** Check `select * from email_events where email_to = '...' order by created_at desc;` for delivered / bounced events.
8. **Is the template enabled?** `select enabled from email_templates where slug = 'trial_day_13_last_day';`

---

## 10. What still requires a code deploy

You **don't** need to deploy code to change:
- Template subject, body, variables list, enabled state
- Step offsets, step audience filters, step enabled state
- Adding new sequences/templates/steps via SQL
- Backfilling sequence_send_log for new sequences

You **do** need to deploy code to change:
- The email wrapper chrome (logo, header gradient, footer base) → `src/lib/email-theme.ts`
- The set of available trigger events (`trial_started`, `wedding_date`, etc.) → cron routes
- The set of template variables the runner provides → cron routes that build `templateContext`
- The send provider (currently Resend; SES adapter is a one-file swap) → `src/lib/email.ts`
- The runner itself (audience matching, due-step calc, dedup behavior) → `src/lib/email-sequences.ts`

---

## 11. Cost & scale notes

- **Resend** is the current send provider. At today's volume, expected monthly cost is well under $20. Switch to SES only if monthly Resend bills exceed ~$200; the migration is a single-file adapter swap behind `sendEmail()`.
- **Cron load**: the candidate window for trial-emails was expanded from 15 days to 95 days in Phase 2 to cover the post-downgrade nurture sequence. Each candidate runs two `runSequenceForRecipient` calls (one per sequence). For 1000 trial users, that's ~2000 sequence loads × ~3 small DB queries each = ~6000 queries per cron run. Fine for current scale; revisit if user count goes 100×.
- **Email-preferences fetch** happens per recipient inside the cron loop. If hot enough to matter, batch-fetch upfront.
