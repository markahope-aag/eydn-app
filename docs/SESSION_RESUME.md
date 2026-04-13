# Session Resume

**Last updated:** 2026-04-12 (end of freemium/AI upsell shipping session)

This file is the single-source handoff between Claude Code sessions. When
starting a new session — especially on a different machine — read this
first. It captures context that lives in local machine memory (`~/.claude`)
and won't sync across machines.

---

## Current state

**Freemium + reverse-trial model shipped end-to-end.** 17 commits on
master today. CI is fully green for the first time since March 27. Tree
is clean. Everything that can be built without Stripe dashboard action
is done.

Latest green CI run: `24319091580` (6m16s, all 7 jobs passing — install,
build, typecheck/lint, unit tests 778/778, security audit clean at
`--audit-level=high`, Playwright 45/45 a11y tests).

### What's in production now

- **14-day reverse trial** → auto-downgrade to free tier (no lockout)
- **Pro Lifetime $79** (featured) — existing one-time purchase
- **Pro Monthly $14.99** — planned hedge, NOT yet wired (blocked on
  Stripe dashboard work)
- **Free tier keeps:** guest list, budget tracker, task timeline (now
  AI-personalized at onboarding), partner collaboration, wedding
  website, and capped Claude chat (10 tool calls/month via
  `src/lib/tool-call-counter.ts`)
- **Free tier loses:** day-of binder PDF, vendor email templates,
  real-entity attachments, AI catch-up plans, AI budget optimizer,
  web_search tool inside chat
- **Automated 3-day trial expiry reminder** via
  `/api/cron/trial-reminders` daily at 15:00 UTC, CAN-SPAM compliant,
  dedupe-safe on `weddings.trial_reminder_sent_at`

### Key files to know

| Concern | File |
|---|---|
| Tier enum + feature map | `src/lib/subscription.ts` |
| Free-tier chat cap counter | `src/lib/tool-call-counter.ts` |
| Onboarding AI personalizer | `src/lib/ai/task-personalizer.ts` |
| Catch-up plan generator | `src/lib/ai/catch-up-generator.ts` |
| Budget optimizer generator | `src/lib/ai/budget-optimizer.ts` |
| Chat tools (9 actions + validation) | `src/lib/ai/chat-tools.ts` |
| Client-side premium hook | `src/components/PremiumGate.tsx` |
| Free-tier upgrade banner | `src/components/TrialBanner.tsx` |
| Catch-up surfacing | `src/components/CatchUpBanner.tsx` (dashboard home) |
| Budget optimizer surfacing | `src/components/BudgetOptimizerBanner.tsx` (budget page) |
| Chat meter pill | `src/app/dashboard/chat/page.tsx` |
| CI config | `.github/workflows/ci.yml` |

---

## Pricing model (locked 2026-04-12)

This is the authoritative spec. Don't drift from it without explicit
agreement.

### SKUs

- **Pro Lifetime — $79 one-time** (featured, default offer)
  - Framing: "Pay once. Yours through the wedding day."
  - Already exists in code. One-time Stripe checkout.
- **Pro Monthly — $14.99/month** (secondary hedge)
  - Framing: "Cancel anytime. Switch to Lifetime whenever you're ready."
  - **NOT yet built.** Needs Stripe dashboard setup → task #11.
- **Memory Plan — $29/year** (post-wedding LTV lever, orthogonal to Pro)
  - Already exists (`weddings.memory_plan_active` column, Stripe
    webhook handler at `api/webhooks/stripe`).

### Why Lifetime is featured, not monthly

1. Wedding planning is finite (12–18 months with a clear end, closer
   to TurboTax than Notion). Subscription framing is structurally
   awkward for a bounded project.
2. "Yours forever" has psychological pull monthly doesn't.
3. Anchors cleanly against the $4,100 human planner: "$79 vs a $4,100
   planner" is a clean compare.
4. Already a proven conversion path — retiring it is a strategic risk.

### Break-even math (pricing page anchor)

$14.99 × 12 = $179.88 for a full 12-month planning cycle. $79 Lifetime
is a 56% discount for committing upfront. Break-even at 5.27 months;
almost every couple plans 12+ months. The monthly option's main job
is to make Lifetime look like a deal, not to be the primary path.

### Full feature matrix

| Feature | Free | Trialing | Pro | Beta/Admin |
|---|---|---|---|---|
| Guest list, budget, task timeline, collaboration, website | ✅ | ✅ | ✅ | ✅ |
| AI-personalized task timeline (at onboarding) | ✅ | ✅ | ✅ | ✅ |
| Chat with Claude | capped (10/mo) | unlimited | unlimited | unlimited |
| `web_search` tool inside chat | ❌ | ✅ | ✅ | ✅ |
| AI catch-up plans | ❌ | ✅ | ✅ | ✅ |
| AI budget optimizer | ❌ | ✅ | ✅ | ✅ |
| Day-of binder (PDF export) | ❌ | ✅ | ✅ | ✅ |
| Vendor email templates | ❌ | ✅ | ✅ | ✅ |
| Attachments on real entities | ❌ | ✅ | ✅ | ✅ |

---

## Todo list (ranked by what unblocks the next milestone)

### Blocked on Stripe dashboard work (human-in-loop)

- **#11 — Stripe: add Pro Monthly subscription product**
  - You need to: log into Stripe dashboard, create a $14.99/month
    recurring product, grab the `price_id`, paste it into an env var.
  - Then I can: wire the Pro Monthly checkout flow, add webhook
    handlers for `customer.subscription.updated` and `deleted` (for
    downgrade-to-free, not lockout), and add `invoice.payment_failed`
    retry handling. ~30–60 min of coding.

- **#12 — Pricing page rewrite** (blocked on #11)
  - Lead with Pro Lifetime $79, show Pro Monthly $14.99 as secondary
    with strikethrough math ($179.88 → save $100+).
  - Copy spec is in `project_pricing_model.md` in local memory, also
    captured in this file above.

- **#13 — Trial banner copy rewrite** (blocked on #12)
  - Current placeholder copy in `src/components/TrialBanner.tsx` is
    serviceable but needs final wording once the pricing page is ready.

### Independent, unblocked, large

- **#9 — Make chat the primary UI surface**
  - UX overhaul. Elevate chat-with-tools from side feature to primary
    differentiator. Persistent chat panel or prominent "Ask Eydn" CTA
    on every dashboard screen. Qualitatively different work from the
    infra-heavy session that shipped today — worth its own focused
    session.

### Security follow-up (deferred with care)

- **#15 — Upgrade `@anthropic-ai/sdk` 0.80 → 0.88**
  - Advisory: GHSA-5474-4w2j-mq4c (moderate — memory tool path
    validation sandbox escape).
  - Breaking change. We use the SDK in 5 places shipped today:
    `chat-tools.ts`, `claude-client.ts`, `task-personalizer.ts`,
    `catch-up-generator.ts`, `budget-optimizer.ts`.
  - Check changelog between 0.80 and 0.88 for tool-use API changes
    (ToolUseBlock, TextBlock, message content block handling) before
    upgrading. Run full vitest + manual chat smoke test after.
  - Currently below `--audit-level=high` threshold so CI stays green.

---

## Load-bearing preferences (from local memory)

These live in `~/.claude/projects/.../memory/` on the dev machine but
won't sync. Copying the ones that matter here so any session has them.

### User role

Senior technical product leader. Treat explanations at the "smart
engineer who can read any stack" level — no basic hand-holding, and
no over-hedging. Decisions backed by trade-off reasoning, not just
"here are options."

### Collaboration feedback

1. **Don't run the full test suite after every edit.** It slows
   iteration dramatically. `tsc --noEmit` and `eslint` on a specific
   file are fast and fine. Full vitest batches to commit time. Full
   build batches to end-of-session or when critical.

2. **Commit and push after completing work.** Tree should be clean
   when done. Multiple commits in a session is normal — don't try to
   pile everything into one.

3. **Always run migrations immediately** after creating them. The
   Supabase CLI is linked and works: `echo "Y" | npx supabase db push`.
   Never tell the user to run them manually.

4. **Inclusive language only.** Partner 1 / Partner 2, Attendant,
   Honor Attendant — not bride/groom/bridesmaids/groomsmen. Mirror the
   couple's own language if they self-identify.

5. **The freemium model doc in this file is load-bearing.** Don't
   drift from it when making pricing/positioning decisions.

### Inference cost constraint

Trial users get full Pro (unlimited chat). Free tier is capped at 10
tool calls/calendar month via `src/lib/tool-call-counter.ts`. **Cap is
on tool calls, not messages** — the agentic loop runs up to
`AI.MAX_TOOL_ITERATIONS` (5) per user message, so messages are a poor
cost proxy. Without the cap, 1000 free-trial signups/month would cost
$5–15K in Claude inference, which would break the bootstrap budget.
Tune the limit after launch based on conversion data.

---

## Recent commits (reverse chronological)

```
fafc5d2  Fix axe link-in-text-block on mood-board Pinterest link
21e7e36  Fix axe aria-prohibited-attr on seating; expose node targets in test
0148264  CI: fix build (missing service role key) + patch security vulns
6605405  CI: re-enable push trigger on master
8139f8f  Sync docs to reflect freemium model + AI upsell features
ff697bf  Daily cron: send 3-day trial-expiry reminder email
8b03981  Surface AI budget optimizer on the budget page
3ddb1b0  AI budget optimizer: schema, generator, and API route
1d98249  Surface AI catch-up plans on the dashboard home
7f2c18b  AI catch-up plans: schema, generator, and API route
62724ef  Personalize onboarding task messages with Claude
e6acedb  Show tool-call meter pill on chat page for free-tier users
bab088f  Show upgrade banner to free-tier users after trial ends
eaf964f  Enforce free-tier tool-call cap; gate web_search to non-free
e8bbf3c  Refactor subscription model: tiers + per-feature gates
bf3ea97  Harden AI chat tools: disambiguate fuzzy matches, validate inputs
```

Use `git log --oneline 08842f4..HEAD` for the full session scope.

---

## Migrations applied this session

```
supabase/migrations/20260412000000_catch_up_plans.sql
supabase/migrations/20260412100000_budget_optimizations.sql
supabase/migrations/20260412200000_trial_reminder_sent_at.sql
```

All applied to the remote Supabase DB and types regenerated into
`src/lib/supabase/types.ts`. No pending migrations.

---

## Suggested next-session opener

Pick one:

1. **Do the Stripe dashboard step (your action), then come back and I'll
   wire #11 → #12 → #13 end-to-end in one focused session.** This
   unblocks three tasks at once and gets the hedge SKU live.

2. **Start #9 (chat as primary UI).** Independent, large, UX-heavy.
   Different shape of work than today's infra push.

3. **Start #15 (anthropic SDK upgrade).** Small surface area but
   requires careful testing across 5 files. Could be bundled with any
   other Claude work.

When in doubt: option 1 has the highest business leverage because it
closes the loop on the pricing model that's already shipped
everywhere else.
