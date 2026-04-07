# Subscription Flow

How users move from free trial to paid access, and how access is enforced across the app.

---

## Tiers

| Tier | Access | Duration | Cost |
|------|--------|----------|------|
| Free trial | All features | 14 days from wedding creation | $0 |
| Premium | All features | Lifetime | $79 one-time |
| Beta | All features | Lifetime | $0 (invite only) |

---

## Trial

A 14-day free trial starts automatically when a user creates a wedding. The clock runs from `trial_started_at` on the `weddings` table (falls back to `created_at` if null). No credit card is required.

During the trial, users have unrestricted access to every feature including AI chat, file attachments, and PDF export. Collaborators (partners, coordinators, parents) inherit the wedding owner's trial status.

### Trial Banner

A persistent banner appears at the top of every dashboard page during the trial:

- Shows "X days left in your free trial" with an "Upgrade — $79" button
- Subtle styling (lavender border) for most of the trial
- Turns more prominent (thicker violet border) when 3 or fewer days remain
- Hidden for paid users, beta users, and admins

**Component:** `src/components/TrialBanner.tsx`
**Rendered in:** `src/app/dashboard/layout.tsx`

### Trial Expiry

When the trial ends, `hasAccess` flips to `false`. The user can still access non-premium dashboard pages (tasks, guests, vendors, budget, seating) but premium features are blocked.

---

## Upgrade Path

### Where users can upgrade

| Location | When visible | What it shows |
|----------|-------------|---------------|
| Trial banner (all dashboard pages) | During active trial | Countdown + "Upgrade — $79" button |
| Settings page (Subscription section) | Always (when not paid) | Trial status or "trial has ended" + upgrade button |
| Paywall wrapper (chat page) | During trial | Small "Unlock now — $79" link in lavender bar |
| Paywall wrapper (chat page) | After trial expires | Full lock screen replacing the feature |
| Premium action toast | After trial expires | Toast on blocked actions (PDF export, etc.) with "See pricing" link |

All paths lead to `/dashboard/pricing`.

### Pricing Page

`src/app/dashboard/pricing/page.tsx`

- Shows the $79 one-time price
- Lists included features (AI chat, PDF export, attachments, unlimited usage, etc.)
- Promo code field — validates against `/api/promo-codes/validate`, can reduce price to $0
- "Get Full Access" button creates a Stripe checkout session
- $0 purchases (100% discount codes) bypass Stripe entirely and grant access immediately

### Payment Flow

1. User clicks "Get Full Access" on pricing page
2. `POST /api/subscribe` creates a Stripe checkout session (or handles $0 directly)
3. User completes payment on Stripe's hosted checkout
4. Stripe fires `checkout.session.completed` webhook
5. Webhook creates a row in `subscriber_purchases` with `status: 'active'`
6. If a promo code was used, a `promo_code_redemptions` row is created and usage count is atomically incremented
7. User is redirected back to the dashboard with full access

---

## Access Enforcement

### Server-side

**`requirePremium()`** — guards premium API routes. Returns `null` if the user has access, or a `403 NextResponse` if they don't.

Used on:
- `POST /api/chat` (AI assistant)
- `POST /api/attachments` (file uploads)
- PDF generation routes

### Client-side

Three mechanisms, used depending on the UX pattern:

**`Paywall` wrapper** — wraps an entire feature. Shows the feature normally during trial (with a small upgrade bar), replaces it with a lock screen after expiry.
- Used on: `/dashboard/chat`

**`usePremium().guardAction`** — wraps individual button actions. Shows an upgrade toast if the user lacks access; runs the action normally if they do.
- Used on: PDF export buttons in day-of planner and guest list

**`PremiumButton`** — a button component that uses `guardAction` internally. Drop-in replacement for `<button>` on premium actions.

---

## Subscription Status

### API

`GET /api/subscription-status` returns:

```json
{
  "hasAccess": true,
  "isPaid": false,
  "isBeta": false,
  "isTrialing": true,
  "trialDaysLeft": 9,
  "trialExpired": false
}
```

### Resolution Order

`getSubscriptionStatus()` in `src/lib/subscription.ts` checks in this order:

1. **Admin or beta role** in `user_roles` — full access (`isBeta: true` for beta)
2. **Active purchase** in `subscriber_purchases` — full access
3. **Owned wedding trial** — compute days remaining from `trial_started_at`
4. **Collaborator inheritance** — check the wedding owner's purchase or trial status
5. **No wedding, no collaboration** — no access

### Client-side Hook

`usePremium()` from `src/components/PremiumGate.tsx` exposes:

| Field | Type | Description |
|-------|------|-------------|
| `hasAccess` | boolean | Whether the user can use premium features |
| `isPaid` | boolean | Whether access comes from a purchase or privileged role |
| `isBeta` | boolean | Whether the user has the beta role |
| `isTrialing` | boolean | Whether the user is in an active trial |
| `trialDaysLeft` | number | Days remaining in trial (0 if not trialing) |
| `loaded` | boolean | Whether the status has been fetched |
| `guardAction` | function | Wraps a callback — shows upgrade toast if no access |

Status is fetched once and cached across all components via `useSyncExternalStore`.

---

## Settings Page

The Settings page (`/dashboard/settings`) shows a Subscription section:

| State | What the user sees |
|-------|--------------------|
| Beta user | Green dot + "Beta access — full features" |
| Paid user | Green dot + "Premium — lifetime access" |
| Active trial | "Free trial — X days remaining" + Upgrade button |
| Expired trial | "Your free trial has ended" + Upgrade button |

---

## Collaborator Access

Collaborators do not have their own subscription. They inherit the wedding owner's status:

- If the owner has paid, collaborators get full access
- If the owner is in a trial, collaborators share the same trial countdown
- If the owner's trial expires, collaborators lose premium access too

The owner upgrading instantly unlocks access for all collaborators.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/subscription.ts` | `getSubscriptionStatus()`, `requirePremium()`, trial math |
| `src/components/PremiumGate.tsx` | `usePremium()` hook, `PremiumButton` component |
| `src/components/Paywall.tsx` | Feature-level paywall wrapper |
| `src/components/TrialBanner.tsx` | Persistent trial countdown banner |
| `src/app/dashboard/pricing/page.tsx` | Pricing page with promo code support |
| `src/app/api/subscription-status/route.ts` | Public status endpoint |
| `src/app/api/subscribe/route.ts` | Stripe checkout session creation |
| `src/app/api/webhooks/stripe/route.ts` | Payment confirmation webhook |
| `src/app/dashboard/settings/page.tsx` | Subscription section in user settings |
