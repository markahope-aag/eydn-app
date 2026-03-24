# Eydn Beta Launch Plan

## Overview

Eydn's pre-launch strategy uses a two-tier approach to build early traction:

1. **Beta Program** — 50 free licenses for early adopters who get full access at no cost
2. **Waitlist** — unlimited signups with an automatic 20% discount for anyone who arrives after the beta is full

This creates urgency (limited spots), rewards early adopters (free access), and converts overflow interest into future paying customers (discounted price).

---

## How It Works

### The User Journey

**Visitor lands on `eydn.app/beta`:**

- The page checks how many beta spots remain in real time
- If spots are available, the visitor sees the beta code (`BETA50`) and a "Start Planning — Free" button that links to sign-up
- If the beta is full, the page automatically switches to a waitlist form

**Beta user (spots available):**

1. Visitor sees the `BETA50` code displayed on the page with a slots counter (e.g., "12 of 50 spots remaining")
2. They click "Start Planning — Free" → taken to the sign-up page
3. After creating an account, they enter `BETA50` on the pricing page
4. The code gives them 100% off — full access, no payment required
5. They start planning their wedding immediately

**Waitlist user (beta full):**

1. Visitor sees "Beta is full — join the waitlist" with a name + email form
2. They submit the form
3. They immediately receive a branded email with an exclusive 20% discount code (`WAITLIST20`)
4. The email explains they'll be notified at launch and can use the code then
5. When Eydn launches publicly, they sign up and enter `WAITLIST20` at checkout ($79 → $63.20)

### Automatic Transitions

The beta-to-waitlist transition is fully automatic. No admin intervention required:

- The `/beta` page queries the `BETA50` promo code's usage in real time
- When `current_uses` reaches `max_uses` (50), the page switches from showing the beta code to showing the waitlist form
- All waitlist emails are sent instantly on signup via Resend

---

## Setup Instructions

### Step 1: Create the Promo Codes

Go to **`eydn.app/dashboard/admin/promo-codes`** and create two codes:

**Code 1 — Beta Access:**
- Code: `BETA50`
- Discount Type: Percentage
- Discount Value: 100
- Max Uses: 50
- Expiration: (leave blank or set a date if you want the beta to end by a certain date)
- Description: "Free beta access — 50 spots"

**Code 2 — Waitlist Discount:**
- Code: `WAITLIST20`
- Discount Type: Percentage
- Discount Value: 20
- Max Uses: (leave blank for unlimited)
- Expiration: (leave blank or set to your planned launch date + buffer)
- Description: "Waitlist signup discount"

### Step 2: Test the Flow

1. Visit `eydn.app/beta` — you should see the beta code with "50 of 50 spots remaining"
2. Create a test account and apply `BETA50` on the pricing page — should show $0
3. Complete the $0 purchase — verify full access is granted
4. In the admin panel, verify `BETA50` shows 1/50 uses

To test the waitlist flow:
1. Temporarily set `BETA50` max uses to 1 in the admin panel
2. Visit `eydn.app/beta` — should show the waitlist form
3. Submit a test email — verify the discount code email arrives
4. Check `eydn.app/dashboard/admin/waitlist` — should show the signup
5. Reset `BETA50` max uses back to 50

### Step 3: Promote

Share the beta page URL: **`eydn.app/beta`**

Recommended channels:
- Social media (Instagram, TikTok, Pinterest — where engaged couples are)
- Wedding planning forums and communities
- Email to your existing contact list
- Paid ads targeting "wedding planning" keywords
- Partnerships with wedding blogs or influencers

### Step 4: Monitor

**Admin dashboard pages to watch:**

| Page | What to monitor |
|------|----------------|
| `/dashboard/admin/promo-codes` | BETA50 usage count (how fast spots are filling) |
| `/dashboard/admin/waitlist` | Waitlist signups + email delivery status |
| `/dashboard/admin` (Overview tab) | Total subscribers, signups, conversion rate |
| `/dashboard/admin/lifecycle` | Account phase distribution |

---

## Architecture

### Database Tables

**`promo_codes`** — stores both BETA50 and WAITLIST20 with usage tracking
**`promo_code_redemptions`** — records who used which code and when
**`waitlist`** — stores name, email, source, and email delivery status

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/public/beta` | Check beta slot availability (no auth required) |
| `POST /api/public/beta` | Join waitlist + auto-send discount email (no auth required) |
| `POST /api/promo-codes/validate` | Validate a code at checkout (auth required) |
| `POST /api/subscribe` | Process purchase with optional promo code |
| `GET /api/admin/waitlist` | Admin view of all waitlist signups |
| `GET/POST/PATCH /api/admin/promo-codes` | Admin CRUD for promo codes |

### Security

- Waitlist signup is rate-limited (15 requests/minute per IP)
- Duplicate emails are rejected (unique index on lowercase email)
- Promo codes are validated server-side at checkout (not just client-side)
- One redemption per user per code
- $0 purchases bypass Stripe entirely (no minimum charge issue)

---

## After Launch

When you're ready to transition from beta to general availability:

1. **Disable `BETA50`** — toggle it off in the admin promo codes panel
2. **Update the `/beta` page** — or redirect it to the main landing page
3. **Keep `WAITLIST20` active** — let waitlist users redeem their discount
4. **Email the waitlist** — announce the launch with their discount code reminder
5. **Optionally create new codes** — for marketing campaigns, partnerships, etc.

The promo code system is reusable for any future campaigns beyond the beta launch.
