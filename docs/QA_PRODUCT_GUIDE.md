# Eydn — Product Guide for QA

Read this before you start testing. It's the context you need to make
sensible decisions about what should and shouldn't happen.

## What Eydn is

Eydn is a wedding planning web app. It replaces the typical jumble of
spreadsheets, vendor emails, Pinterest boards, Notion templates, and
group chats couples end up using during their engagement. Everything
lives in one place — tasks, budget, guest list, vendors, seating chart,
day-of timeline, the wedding website itself — and an AI assistant on top
that has the couple's full context (their date, budget, who they've
booked, who said yes) and gives direct answers instead of generic
advice.

The brand voice is **warm, direct, real**. No exclamation points, no
cheerleader copy, no "We're SO excited for you!!". If you see something
that reads like a generic SaaS app — flag it.

## Who it's for

### Primary user: the couple

Anyone planning a wedding, typically 12 to 18 months out. Most couples
will sign up together but use it on a single account; one partner can
invite the other as a **collaborator** with full edit access.

The tone and language are deliberately inclusive — **Partner 1 / Partner
2**, **Attendant / Honor Attendant**, no bride/groom or
bridesmaid/groomsman defaults. Same-sex couples, non-traditional
ceremonies, and couples who don't fit a gendered template are all
first-class users. If you see legacy "bridal party" language anywhere,
that's a bug.

### Secondary users

- **The partner / co-planner** — invited as a collaborator, full edit
  access. Tests should verify two people can edit simultaneously without
  stepping on each other.
- **The wedding coordinator** — can be invited with the Coordinator
  role, more limited access (can manage tasks, vendors, guests, but
  can't change core wedding details like the date or budget).
- **Family / parents** — can be invited with the Parent role, read-only.
- **Vendors** — never sign in. They receive shared links: vision board
  link to see inspiration, RSVP-related material to see guest responses,
  etc.
- **Wedding guests** — never sign in. They interact with the public
  wedding website to RSVP, upload photos, view the schedule, etc.

## The product promise

> Wedding planning without the chaos. Everything in one place, an AI
> that knows your wedding, and a binder ready for your coordinator on
> the day.

Three things that make Eydn different and which you should validate
work as advertised:

1. **The AI assistant has real context** — when the couple asks "Am I
   behind?" it should know their wedding date and unfinished tasks. It
   should not give generic advice that ignores their actual situation.
2. **Changes cascade** — if the wedding date changes, the task timeline
   shifts, the rehearsal dinner moves, related fields update. The
   couple shouldn't have to manually re-do everything.
3. **The day-of binder is ready** — at any point the couple should be
   able to export a complete PDF binder (timeline, vendor contacts,
   wedding party jobs, packing checklist, seating chart, ceremony
   layout) for their coordinator. This is the highest-stakes deliverable
   — if it's incomplete or wrong, that's a critical bug.

## How couples pay

- **14-day free trial** when they sign up. Full access to everything.
- After trial, two paid options:
  - **Pro Monthly** at $14.99/month — cancel anytime.
  - **Lifetime** at $79 one-time — pays for itself after ~5 months,
    never expires.
- Without an upgrade, the app becomes **read-only** after trial. They
  can still view and export their data, but not edit. No data is ever
  deleted at this point.
- **12 months post-wedding** the account goes read-only again. The
  optional **Memory Plan** ($29/year) keeps the wedding website live
  and data fully accessible indefinitely.

Test that the trial banner is honest about days remaining, the upgrade
flow is one click, and the read-only state is enforceable (try to edit
something while expired — it should fail gracefully, not 500).

## Feature areas (use these as your testing groups)

### Onboarding (`/dashboard/onboarding`)
Multi-step form: partner names, date, budget, guest count, venue
status, already-booked vendors, an "Ask Eydn anything" prompt. Ends
with a celebration snapshot screen. Generates the task timeline,
budget categories, and questionnaire responses on completion.

### Dashboard home (`/dashboard`)
Greeting, day countdown, task progress, budget snapshot, vendor
status, RSVP totals, contextual nudges, "Add Couple Photo" upload, AI
chat shortcut. Most things on this page are server-rendered from data
elsewhere — if vendor counts disagree with the actual vendor tab,
that's a bug.

### Tasks (`/dashboard/tasks`)
~50 auto-generated tasks based on the wedding date and what's already
booked. Couple can mark complete, add custom tasks, edit due dates,
add notes. When the wedding date changes, milestone tasks shift to
maintain relative timing (e.g., "12 months before" stays 12 months
before); appointment tasks are flagged but NOT moved.

### Budget (`/dashboard/budget`)
36 pre-seeded line items in recommended categories. Couple sets
estimated and actual amounts. "Remaining" card color-codes healthy /
tight / over budget. Each row shows recommended % of total budget.

### Guests (`/dashboard/guests`)
Add individually, by CSV import, or from phone contacts. Track RSVPs,
meals, groups, plus-ones. **Kids and plus-ones are full guest records**
linked to a head guest via the "+ Child / +1" button — they get their
own RSVP, meal, and seat. The list shows a "+N guests" badge on heads
with companions.

### Vendors (`/dashboard/vendors` + `/dashboard/vendors/directory`)
Track each vendor through six stages: Searching → Contacted → Quote
Received → Booked → Deposit Paid → Paid in Full. Couples find vendors
by browsing the Eydn directory (curated suggested_vendors), and when a
search has no internal match it falls back to Google Places (Pro
feature). Each vendor has email templates, contract uploads, day-of
arrival time, and vendor meal count.

### Seating chart (`/dashboard/seating`)
Two tabs: **Reception** (drag-and-drop tables with capacity, shape,
seat assignments) and **Ceremony** (altar/aisle layout, processional
ordering). Both have print and reset.

### Vision board (`/dashboard/mood-board`)
Pinterest-style grid. Upload images or paste URLs. Categorize, tag
locations, link to vendors. Has a public share link
(`/w/{slug}/vision`) for sending to vendors — strips private vendor
tags and locations.

### Day-of planner (`/dashboard/day-of`)
Multi-tab planner: timeline (auto-sorts by time as you edit), ceremony
script, music, speeches, setup tasks, attire, vendors & party
(including the "Final meal count for catering" card), packing
checklist. Binder PDF export pulls everything together.

### Wedding website (`/dashboard/website` to build, `/w/{slug}` to view)
Couple builds it: URL, theme/colors, story, schedule, travel info,
hotels, FAQ, registry links, RSVP setup. Live preview while editing
plus a progress checklist tracking remaining sections.

### RSVP system (`/w/{slug}` for guests)
Two QR options: a **single shared Wedding QR** (one per invite, guests
look up their name) or **per-guest QR codes** (each invite gets the
matching guest's QR, opens the form pre-filled). Guests can also type
the URL and search by name. Plus-ones submitted via the public form
become full guest records automatically.

### AI chat (`/dashboard/chat`)
Has the couple's full context loaded. Can take actions (add a guest,
mark a task done, save to vision board, search Google for vendors).
Free tier has a per-month tool-call cap. Pro tiers unlimited.

### Collaboration (`/dashboard/settings` → Collaborators)
Invite by email with Partner, Coordinator, or Parent role. Partners
get full edit access. Coordinators can manage tasks/vendors/guests but
not core wedding details. Parents are read-only.

### Help (`/dashboard/help`)
User guide + FAQ + What's New + Shortcuts. The FAQ should answer most
common couple questions. If a tester finds themselves wishing for an
answer not in here, log it as a doc gap.

## Architecture at a glance

You don't need to read code, but knowing the shape helps you locate
issues:

- **Frontend**: Next.js 16 (App Router). Most dashboard pages are
  client components with their own state and skeleton loading. Public
  pages and a few dashboard pages are server-rendered.
- **Auth**: Clerk. Sign up / sign in / session management.
- **Database**: Supabase Postgres. Couples' data is isolated per
  `wedding_id`; admin client bypasses RLS on server routes only.
- **Payments**: Stripe Checkout for both plans; webhook handler
  records the purchase.
- **AI**: Anthropic Claude (chat, budget optimizer, catch-up plans,
  task personalization, blog content).
- **Email**: Resend (transactional), Cadence (marketing sequences).
- **SMS / push**: Twilio for SMS, web push for browser notifications.
- **Hosting**: Vercel. Deploys on push to master.

## Test environment / accounts

### Your admin account — `sophie.hope@asymmetric.pro`

Your main work email is already set up as an **admin account**. Use it
**only** for testing the platform admin tooling (`/dashboard/admin`) —
vendor moderation, blog editor, integrations health, user/wedding
search, cron triggers, analytics, etc.

A couple of things to know:

- Admin accounts auto-redirect from `/dashboard` straight to
  `/dashboard/admin`. You won't see the couple-facing dashboard from
  this account, which is why you need the aliases below for everything
  else.
- Admin actions are real — if you delete a vendor from the directory,
  it's gone for every couple. Be deliberate about what you click.
- Anything destructive (deleting vendors, banning users, hard
  deletes) should be limited to test fixtures Mark sets up for you —
  ask before purging anything you didn't add yourself.

### Couple-facing testing — `+alias` accounts

For testing the actual couple-facing app (everything outside
`/dashboard/admin`), use the `+designator` alias trick on your work
email (`sophie.hope+designator@asymmetric.pro`). Every message lands
in your real inbox, but Eydn and Clerk treat each alias as a
completely separate account — which means you can be signed in as
multiple test couples in different browser sessions, and the alias
itself tells you at a glance which tier or scenario you're working
in.

Suggested aliases (pick whatever's useful — you don't need all of them
day one):

| Purpose | Sign up with |
|---|---|
| Fresh trial — your default | `sophie.hope+trial@asymmetric.pro` |
| Pro Monthly subscriber | `sophie.hope+pro-monthly@asymmetric.pro` |
| Lifetime subscriber | `sophie.hope+lifetime@asymmetric.pro` |
| Trial-expired (after 14 days) | `sophie.hope+expired@asymmetric.pro` |
| Couple's partner (for collaboration tests) | `sophie.hope+partner@asymmetric.pro` |
| Coordinator role | `sophie.hope+coordinator@asymmetric.pro` |
| Parent / read-only role | `sophie.hope+parent@asymmetric.pro` |
| RSVP guest | `sophie.hope+guest@asymmetric.pro` |
| Photo-upload guest | `sophie.hope+guest2@asymmetric.pro` |

### Walking yourself up the tiers

- **Fresh trial**: sign up with any of the aliases above — you're on
  day 1 of a 14-day trial with full access.
- **Pro Monthly tier**: from your test account, upgrade and pay with
  Stripe test card `4242 4242 4242 4242` (expiration any future date,
  CVC any 3 digits). Test mode never charges anyone.
- **Lifetime tier**: same flow, pick the Lifetime plan.
- **Card decline test**: Stripe test card `4000 0000 0000 0002`
  triggers a decline cleanly.
- **Trial-expired**: either wait 14 days, or skip this state on your
  first pass and circle back later.
- **Collaboration**: invite a partner/coordinator/parent alias from
  your main test couple — accept the invite in a different browser
  (or incognito) so you can have both sessions open at once.

### Browser session tips

- Use one **regular** browser window for your main test account.
- Use a **private / incognito** window for the partner or guest role,
  so both can be signed in simultaneously without colliding sessions.
- Some scenarios (multi-collaborator editing) want a third — use a
  second browser entirely (e.g., Firefox alongside Chrome).

### What to ask Mark for

Nothing required up front — your admin account and the `+alias`
pattern cover everything self-serve. Ping Mark if:

- You need a test fixture set up (e.g., a couple with 150 guests and
  3 months of historical activity for performance testing).
- You hit a feature that only works in production data, not your test
  data (a webhook that requires a real third-party callback, etc.).
- You think you've found something destructive in the admin panel
  that needs sandboxing.

## What to log when you find a bug

Use the bug report template in
[QA_TESTING_PROGRAM.md](QA_TESTING_PROGRAM.md). The short version:

- **Where**: exact URL or page name
- **What you did**: step by step
- **What happened**: actual behavior, with a screenshot
- **What you expected**: what should have happened
- **Browser + device**: Chrome 120 on macOS, Safari iOS 17, etc.
- **Account**: which test account / tier
- **Reproducible?** every time, sometimes, once

## What's NOT a bug (don't log these)

- Toast messages that say "Couldn't [do X]" — those are correct error
  handling.
- A 14-day-old free user being read-only after trial expires.
- Plus-ones from old RSVPs not appearing as separate guests (they were
  promoted by a one-time migration; if a couple's data predates May 28
  and was never re-RSVPed, the old name might still be on the parent's
  row).
- The "AI is unavailable right now" message when an external service
  (Anthropic, Twilio, Resend) is throttling — that's by design.
- The dashboard couple photo or wedding website cover taking a second
  to render on first load — server signs the storage URL per request.
- Slightly different formatting between the in-app and PDF-binder
  versions of the timeline — they're rendered by different engines.

## Where the rest of the docs live

- `/docs/USER_GUIDE.md` — couple-facing user guide (what to tell a
  couple, not a tester)
- `/docs/CHANGELOG.md` — engineer-facing release log, useful for
  context on recently-shipped changes
- `/docs/PRODUCT_VISION.md` — strategic / positioning document
- `/dashboard/help` (in-app) — the live FAQ + What's New the couple
  sees
