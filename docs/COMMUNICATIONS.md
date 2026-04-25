# Communication Systems

How Eydn communicates with users across every channel.

> **For email sequences specifically** (templates, step timing, audience filters, the admin editor) see **[EMAIL_SEQUENCES.md](EMAIL_SEQUENCES.md)** — the canonical doc for the DB-driven engine that powers all transactional + lifecycle + nurture sends. This file covers the broader channel inventory.

## Channels Overview

| Channel | Provider | Status | Env Vars Required |
|---------|----------|--------|-------------------|
| Email (transactional + sequences) | Resend | Active | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Email (newsletter / lead nurture) | Cadence (in-house, AWS SES) | Active | `CADENCE_URL`, `CADENCE_NEWSLETTER_FORM_ID` (+ per-quiz form IDs) |
| In-app notifications | Supabase | Active | None (uses existing DB) |
| Date change banners | Supabase | Active | None (uses existing DB) |
| Lifecycle banners | Supabase | Active | None (uses existing DB) |
| Toast messages | Sonner | Active | None (client-side only) |
| Web push | web-push (VAPID) | Active | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| SMS | Twilio | Active | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Email tracking | Resend webhooks | Active | `RESEND_WEBHOOK_SECRET` |

---

## 1. Email (Resend)

**Provider:** Resend (https://resend.com)
**Files:** `src/lib/email.ts`, `src/lib/email-preferences.ts`
**Config:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (defaults to "Eydn <hello@eydn.app>")

### Email Types

#### Lifecycle Emails (Post-Wedding Journey)
Triggered by `/api/cron/lifecycle` — runs daily at 4 AM UTC.

| Email | When | Purpose |
|-------|------|---------|
| `post_wedding_welcome` | Wedding day | Congratulations, your data is safe |
| `download_reminder_1mo` | 1 month after | Export your guest list |
| `download_reminder_6mo` | 6 months after | Half-anniversary! Back up your data |
| `download_reminder_9mo` | 9 months after | 3 months until read-only + Memory Plan offer |
| `memory_plan_offer` | 11 months after | Keep your website live ($29/year) |
| `archive_notice` | 12 months after | Account now read-only |
| `sunset_warning_21mo` | 21 months after | 3 months until permanent deletion |
| `sunset_final` | 23.5 months after | Final notice: deletion imminent |

#### Deadline Reminder Emails
Triggered by `/api/cron/check-deadlines` — runs on a regular schedule.

- Checks for tasks due within 7 days (upcoming) AND tasks past due (overdue)
- Groups all tasks per wedding into a single email
- Overdue section shown with red heading
- Deduplicates: one notification per task, checks for existing before creating
- Respects `deadline_reminders` email preference

#### Collaborator Invitation Emails
Triggered when a collaborator is added via `POST /api/collaborators`.

- Sends styled HTML email: "You've been invited to help plan [names]'s wedding"
- Includes role (partner or coordinator) and sign-in link
- Fire-and-forget — doesn't block the API response

#### Vendor Payment Reminder Emails
Future: can be added to the vendor-reminders cron alongside in-app notifications.

### Email Preferences

**Table:** `email_preferences`
**Management:** `/dashboard/settings` and `/api/public/unsubscribe`

| Preference | Controls |
|-----------|----------|
| `deadline_reminders` | Task deadline and overdue emails |
| `lifecycle_emails` | Post-wedding lifecycle sequence |
| `marketing_emails` | Memory Plan offers, promotional content |
| `sms_reminders` | SMS notifications (when Twilio is configured) |
| `push_notifications` | Web push notifications (when VAPID is configured) |
| `unsubscribed_all` | Master kill switch — stops all communication |

Every email includes a one-click unsubscribe link (CAN-SPAM compliance) via `/api/public/unsubscribe`.

---

## 2. In-App Notifications (Bell Icon)

**Component:** `src/components/NotificationBell.tsx`
**API:** `GET /api/notifications`, `PATCH /api/notifications`
**Table:** `notifications`

### Notification Types

| Type | Trigger | Title Format | Created By |
|------|---------|-------------|-----------|
| `deadline_reminder` | Task due within 7 days | "Upcoming: [task]" | check-deadlines cron |
| `overdue_task` | Task past due date | "Overdue: [task]" | check-deadlines cron |
| `vendor_payment` | Vendor has outstanding balance | "Payment reminder: [vendor]" | vendor-reminders cron |
| `collaborator_edit` | Another user edits shared data | "[Entity] updated" | notifyCollaborators() |

### UI Features
- Bell icon in global header with unread count (caps at 9+)
- Dropdown shows last 20 notifications, newest first
- "Mark all read" button
- Individual read/unread toggle
- Notifications link to related task or vendor when applicable

### Creating Notifications
```typescript
await supabase.from("notifications").insert({
  wedding_id: weddingId,
  type: "deadline_reminder",
  title: "Upcoming: Book photographer",
  body: "This task is due on June 15. Make sure you're on track!",
  task_id: taskId, // optional — links to specific task
  vendor_id: vendorId, // optional — links to specific vendor
});
```

---

## 3. Date Change Alert Banners

**Component:** `src/components/DateSyncBanner.tsx`
**API:** `GET /api/date-alerts`, `POST /api/date-alerts`
**Table:** `date_change_alerts`

### How It Works
1. When a key date/time changes (wedding date or ceremony time), the `PATCH /api/weddings/[id]` endpoint creates an alert record
2. `DateSyncBanner` component loads on every dashboard page
3. Unacknowledged alerts render as amber warning banners at the top of the page
4. Each alert lists what changed, what was auto-updated, and what needs manual action
5. User must click "I understand — I will update affected appointments" to dismiss
6. Dismissal is persisted in the database — survives page navigation and browser sessions

### Alert Types

| Change | Auto-Updated | Flagged for Manual Review |
|--------|-------------|--------------------------|
| Wedding date | Rehearsal dinner date, system-generated task milestones | User-created tasks, completed tasks |
| Ceremony time | Day-of timeline, day_of_plans.content | Vendor arrival times, hair/makeup schedules |

---

## 4. Lifecycle/Archive Banners

**Component:** `src/components/ArchiveBanner.tsx`
**API:** `GET /api/memory-plan`

Displays based on the wedding's `phase` field:

| Phase | Banner | Color |
|-------|--------|-------|
| `active` | Hidden | — |
| `post_wedding` | "Your wedding day has come and gone" | Soft lavender |
| `archived` (no Memory Plan) | "Your account is in read-only mode" | Prominent violet |
| `archived` (with Memory Plan) | "Memory Plan active" | Green |
| `sunset` | "Your account data has been archived" | Red |

---

## 5. Toast Messages (Sonner)

**Library:** `sonner`
**Usage:** Ephemeral, client-side only

Toasts provide immediate feedback for user actions. They are NOT persistent and disappear after a few seconds. Every form submission, save, delete, and error across the app uses toasts.

```typescript
import { toast } from "sonner";
toast.success("Guest added to the list");
toast.error("Couldn't save. Try again.");
toast("Guest removed"); // neutral
```

---

## 6. Web Push Notifications

**Library:** `web-push`
**Files:** `src/lib/push.ts`, `src/app/api/push-subscription/route.ts`
**Table:** `push_subscriptions`
**Status:** Active — VAPID keys configured in Vercel

### Future Enhancement
Add a service worker (`public/sw.js`) to handle push events in the browser and show native OS notifications.

### Architecture
- Users subscribe via `POST /api/push-subscription` with their browser's push subscription object
- Unsubscribe via `DELETE /api/push-subscription`
- One subscription per user per wedding
- `pushToWedding(supabase, weddingId, payload)` sends to all subscribers
- Expired subscriptions (410 Gone) are auto-cleaned

### Payload Format
```typescript
{
  title: "Upcoming: Book photographer",
  body: "This task is due in 3 days",
  url: "/dashboard/tasks",  // optional — opens on click
  tag: "deadline-task-123"   // optional — dedupes in notification tray
}
```

---

## 7. SMS (Twilio)

**Library:** `twilio`
**Files:** `src/lib/sms.ts`
**Status:** Active — Twilio credentials configured in Vercel

### Architecture
- `sendSMS(to, body)` sends a single message
- `smsToWedding(supabase, weddingId, body)` looks up the wedding owner's phone from Clerk and sends
- Phone numbers are normalized to E.164 format automatically
- Twilio is dynamically imported — zero overhead when not configured
- Respects `sms_reminders` preference in email_preferences table

### Usage
```typescript
import { sendSMS, smsToWedding } from "@/lib/sms";

// Direct send
await sendSMS("+15551234567", "Your wedding is in 7 days!");

// Send to wedding owner
await smsToWedding(supabase, weddingId, "Reminder: cake tasting tomorrow at 2 PM");
```

---

## 8. Email Engagement Tracking

**Webhook:** `src/app/api/webhooks/resend/route.ts`
**Table:** `email_events`
**Status:** Active — webhook secret configured in Vercel

### Tracked Events

| Event | What It Means |
|-------|--------------|
| `delivered` | Email reached the recipient's mail server |
| `opened` | Recipient opened the email (pixel tracking) |
| `clicked` | Recipient clicked a link in the email |
| `bounced` | Email could not be delivered (bad address, full inbox) |
| `complained` | Recipient marked the email as spam |

Bounces and complaints are logged with a warning. Future enhancement: auto-unsubscribe on hard bounces or complaints.

---

## Cron Jobs

All cron jobs are protected by Bearer token authentication.

| Job | Route | Schedule | Auth | What It Does |
|-----|-------|----------|------|-------------|
| Deadline check | `/api/cron/check-deadlines` | Regular | `CRON_SECRET` | Finds upcoming (7 days) and overdue tasks, creates notifications + emails |
| Lifecycle | `/api/cron/lifecycle` | Daily 4 AM UTC | `BACKUP_SECRET` | Transitions wedding phases, sends lifecycle emails |
| Vendor reminders | `/api/cron/vendor-reminders` | Weekly | `CRON_SECRET` | Finds vendors with outstanding balances, creates notifications |
| Backup | `/api/cron/backup` | Nightly | `BACKUP_SECRET` | Exports wedding data to JSON, uploads via SFTP |
| Storage cleanup | `/api/cron/storage-cleanup` | Weekly | `CRON_SECRET` | Finds and deletes orphaned files older than 24 hours |

---

## Shared-Edit Notifications

**Function:** `notifyCollaborators()` in `src/lib/audit.ts`

When a collaborator creates a guest, vendor, or task, all OTHER users on the wedding (owner + other collaborators) receive an in-app notification.

### How It Works
1. Called from `POST` handlers in guests, vendors, and tasks routes
2. Fire-and-forget — runs asynchronously, doesn't block API response
3. Uses `createSupabaseAdmin()` to cross user boundaries
4. Skips trivial entity types (chat_messages, settings)
5. Builds contextual messages: "A collaborator added 'John Smith' to the guest list"

### Entity Type Labels
| DB Entity | Display Label |
|-----------|--------------|
| `guests` | Guest list |
| `vendors` | Vendor |
| `tasks` | Task |
| `expenses` | Budget item |
| `wedding_party` | Wedding party |
| `mood_board_items` | Vision board |
| `seating_tables` | Seating chart |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `notifications` | In-app notifications (bell icon) |
| `date_change_alerts` | Persistent date change warnings requiring acknowledgment |
| `email_preferences` | Per-wedding communication preferences (email, SMS, push) |
| `push_subscriptions` | Web push browser subscription objects |
| `email_events` | Email delivery/open/click/bounce tracking |
| `cron_log` | Execution log for all cron jobs |

---

## Environment Variables

### All Configured (Vercel)
```
RESEND_API_KEY=re_xxxxx                    # Email delivery
RESEND_FROM_EMAIL=Eydn <hello@eydn.app>   # From address
RESEND_WEBHOOK_SECRET=whsec_xxxxx          # Email tracking webhooks
CRON_SECRET=xxxxx                          # Deadline + vendor reminder crons
BACKUP_SECRET=xxxxx                        # Lifecycle + backup crons
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxxx          # Web push (public)
VAPID_PRIVATE_KEY=xxxxx                    # Web push (private)
TWILIO_ACCOUNT_SID=ACxxxxx                 # SMS delivery
TWILIO_AUTH_TOKEN=xxxxx                    # SMS auth
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx           # SMS from number
```

---

## Adding a New Notification

To add a new notification type:

1. **In-app:** Insert into `notifications` table with `wedding_id`, `type`, `title`, `body`
2. **Email:** Call `sendEmail()` from `src/lib/email.ts` — respects preferences
3. **Push:** Call `pushToWedding()` from `src/lib/push.ts` — sends to all subscribers
4. **SMS:** Call `smsToWedding()` from `src/lib/sms.ts` — sends to wedding owner
5. **Banner:** Insert into `date_change_alerts` — persists until acknowledged

Best practice: use in-app notification as the baseline, add email for important items, push for time-sensitive items, and SMS only for critical events (wedding day reminders).
