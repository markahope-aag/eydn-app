# Eydn Beta Launch Plan

## Overview

Eydn's pre-launch strategy uses a two-tier approach to build early traction:

- **Beta Program** — 50 free licenses for early adopters who get permanent full access at no cost
- **Waitlist** — unlimited signups with an automatic 20% discount for anyone who arrives after the beta is full

This creates urgency (limited spots), rewards early adopters (free access), and converts overflow interest into future paying customers (discounted price).

---

## How It Works

### The User Journey

**Visitor lands on eydn.app/beta:**

- The page checks how many beta spots remain in real time (counted from assigned beta roles)
- If spots are available, the visitor sees a "Start Planning — Free" button
- If the beta is full, the page automatically switches to a waitlist form

**Beta user (spots available):**

1. Visitor sees the slots counter (e.g., "12 of 50 spots left") and a "Start Planning — Free" button
2. They click the button and are taken to the sign-up page
3. After creating an account, they are automatically redirected to `/beta/claim`
4. The claim page assigns the `beta` role to their account — no promo code, no checkout, no payment page
5. They see a confirmation ("You're in.") and go straight to the dashboard with full access

**Waitlist user (beta full):**

1. Visitor sees "Beta is full — join the waitlist" with a name + email form
2. They submit the form
3. They immediately receive a branded email with an exclusive 20% discount code (WAITLIST20)
4. The email explains they'll be notified at launch and can use the code then
5. When Eydn launches publicly, they sign up and enter WAITLIST20 at checkout ($79 -> $63.20)

### Automatic Transitions

The beta-to-waitlist transition is fully automatic. No admin intervention required:

- The `/beta` page queries the count of users with the `beta` role in real time
- When the count reaches 50, the page switches from showing the beta CTA to showing the waitlist form

---

## What Beta Users Get

- **Permanent full access** — all features, no time limit, no payment ever required
- **No trial countdown** — the trial banner and upgrade prompts are completely hidden
- **Settings label** — their subscription section shows "Beta access — full features"
- **Admin visibility** — they appear as "Beta" in the admin Subscribers tab with a green badge

Beta access is equivalent to a paid subscription in every way except that no payment record is created.

---

## Setup Instructions

### Step 1: Create the Waitlist Promo Code

Go to `eydn.app/dashboard/admin/promo-codes` and create one code:

| Field | Value |
|-------|-------|
| Code | WAITLIST20 |
| Discount Type | Percentage |
| Discount Value | 20 |
| Max Uses | (leave blank for unlimited) |
| Expiration | (leave blank or set to launch date + buffer) |
| Description | Waitlist signup discount |

The beta program itself does not use a promo code. Access is granted via role assignment.

### Step 2: Test the Flow

**Beta flow:**

1. Visit `eydn.app/beta` — you should see "50 of 50 spots left"
2. Click "Start Planning — Free" — you should be taken to sign-up
3. Create an account — you should be redirected to `/beta/claim`
4. You should see "You're in." with a link to the dashboard
5. In the admin Subscribers tab, verify the user shows as "Beta"
6. In the user's Settings page, verify it shows "Beta access — full features"
7. Verify no trial banner appears on the dashboard

**Waitlist flow:**

1. Grant beta role to 50 test users (or temporarily change `BETA_SLOTS` for testing)
2. Visit `eydn.app/beta` — should show the waitlist form
3. Submit a test email — verify the discount code email arrives with WAITLIST20
4. Check `eydn.app/dashboard/admin/waitlist` — should show the signup

### Step 3: Promote

Share the beta page URL: **eydn.app/beta**

Recommended channels:

- Social media (Instagram, TikTok, Pinterest — where engaged couples are)
- Wedding planning forums and communities
- Email to your existing contact list
- Paid ads targeting "wedding planning" keywords
- Partnerships with wedding blogs or influencers

### Step 4: Monitor

| Page | What to monitor |
|------|-----------------|
| /dashboard/admin (Subscribers tab) | Filter by "Beta" to see beta users and count |
| /dashboard/admin/waitlist | Waitlist signups and email delivery status |
| /dashboard/admin (Overview tab) | Total subscribers, signups, conversion rate |

---

## Architecture

### How Beta Access Works

Beta access is a **role in the `user_roles` table**, not a promo code redemption. When a user claims a beta spot:

1. `POST /api/beta/claim` checks the user is authenticated
2. It counts existing beta role assignments to verify spots remain
3. It inserts a row into `user_roles` with `role = 'beta'`
4. The subscription system (`getSubscriptionStatus()`) treats the beta role identically to a paid purchase — `hasAccess: true, isPaid: true, isBeta: true`
5. All client-side gating (trial banner, paywall, premium buttons) respects this status

### Database

| Table | Role |
|-------|------|
| `user_roles` | Stores beta role assignments (role = 'beta') |
| `waitlist` | Stores waitlist signups with email delivery status |
| `promo_codes` | Stores WAITLIST20 code for waitlist discount |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/public/beta` | Check beta slot availability (counts beta roles, no auth) |
| `POST /api/public/beta` | Join waitlist + auto-send discount email (no auth) |
| `POST /api/beta/claim` | Claim a beta slot (assigns beta role, auth required) |
| `POST /api/promo-codes/validate` | Validate WAITLIST20 at checkout (auth required) |
| `GET /api/admin/waitlist` | Admin view of all waitlist signups |

### Pages

| Page | Purpose |
|------|---------|
| `/beta` | Public beta landing page with slots counter or waitlist form |
| `/beta/claim` | Post-signup page that auto-claims the beta slot |
| `/sign-up?redirect_url=/beta/claim` | Sign-up with automatic redirect to claim |

### Security

- Beta claim endpoint requires authentication and is rate-limited
- Duplicate role assignments are prevented (upsert)
- Users who already have a purchase or admin role are handled gracefully
- Waitlist signup is rate-limited (15 requests/minute per IP)
- Duplicate waitlist emails are rejected (unique index)
- Promo codes are validated server-side at checkout

---

## Admin Management

### Granting Beta Access Manually

In the admin Subscribers tab, find a user and change their role dropdown to "Beta." This is useful for granting access to specific people outside the `/beta` page flow (e.g., friends, investors, partners).

### Revoking Beta Access

Change the role dropdown back to "Subscriber." The user will fall back to whatever trial or expired state their account would normally be in.

### Viewing Beta Users

Use the "Beta" filter in the Subscribers tab dropdown to see all beta users at a glance.

---

## After Launch

When you're ready to transition from beta to general availability:

1. **No action needed on beta users** — they keep permanent access
2. **Update the /beta page** — redirect it to the main landing page, or leave it showing the waitlist/full state
3. **Keep WAITLIST20 active** — let waitlist users redeem their discount
4. **Email the waitlist** — announce the launch with their discount code reminder
5. **Optionally create new codes** — for marketing campaigns, partnerships, etc.

The promo code system is reusable for any future campaigns beyond the beta launch.
