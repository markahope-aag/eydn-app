# Subscription Model Documentation

eydn uses a **freemium + reverse trial** model. New couples get full Pro access for 14 days (the reverse trial). At trial end they downgrade to the free tier — they are never locked out and their data is never deleted. Upgrading to Pro (Lifetime $79 or Monthly $14.99) restores full access.

## Business Model Overview

### Core Philosophy
Unlike traditional SaaS models with recurring monthly fees, eydn's one-time purchase model aligns with the finite nature of wedding planning. Couples pay once and have access to all features throughout their planning journey and beyond.

### Value Proposition
- **No Recurring Fees**: One payment covers the entire planning period
- **Full Feature Access**: All premium features included in single purchase
- **Lifetime Access**: Couples can revisit their planning data anytime
- **Budget-Friendly**: Significantly cheaper than hiring a wedding planner ($3K-$15K)
- **Transparent Pricing**: No hidden fees or surprise charges

## Pricing

| SKU | Price | Notes |
|-----|-------|-------|
| Pro Lifetime | $79 one-time | Featured offer. "Pay once. Yours through the wedding day." |
| Pro Monthly | $14.99/month | Secondary hedge. Stripe wiring pending as of April 2026. |
| Memory Plan | $29/year | Post-wedding website retention. Orthogonal to Pro — a separate SKU. |

**Break-even anchor:** $14.99 × 12 = $179.88. $79 lifetime = 56% discount for committing upfront. Almost every couple plans 12+ months, so lifetime is the natural choice.

## Subscription tiers

| Tier | How you get it |
|------|---------------|
| `trialing` | First 14 days after signup |
| `free` | After trial expires with no purchase |
| `pro` | Active row in `subscriber_purchases` |
| `beta` | `user_roles` row with `role = 'beta'` |
| `admin` | `user_roles` row with `role = 'admin'` |

### Feature matrix

| Feature | Free | Trialing | Pro / Beta / Admin |
|---------|------|----------|--------------------|
| Guest list | yes | yes | yes |
| Budget tracker | yes | yes | yes |
| AI-personalized task timeline | yes | yes | yes |
| Partner collaboration | yes | yes | yes |
| Wedding website | yes | yes | yes |
| AI chat (tool-use) | capped | unlimited | unlimited |
| `web_search` in chat | no | yes | yes |
| AI catch-up plans | no | yes | yes |
| AI budget optimizer | no | yes | yes |
| Day-of binder (PDF export) | no | yes | yes |
| Vendor email templates | no | yes | yes |
| Attachments on real entities | no | yes | yes |

The chat cap is on **tool calls**, not messages (one message can trigger up to 10 tool calls in the agentic loop). Free-tier users see a meter pill on the chat page and an upgrade banner when the cap is hit.

### Trial-expiry UX

Trial expiry is a **downgrade**, not a lockout. Copy shifts from "your access is ending" to "unlock chat / binder / templates with Pro." Couples never lose their planning data.

A 3-day trial-expiry reminder email is sent automatically by the `/api/cron/trial-reminders` daily cron. The `weddings.trial_reminder_sent_at` column prevents duplicate sends.

### Pro Lifetime — $79 one-time

- Immediate feature unlock on Stripe `checkout.session.completed`
- No expiration
- Memory Plan ($29/yr) is a separate optional add-on for post-wedding website retention

### Beta access

Beta users get permanent full access with no payment. Access is a role in `user_roles`, not a purchase record. See `docs/BETA_LAUNCH_PLAN.md` for the full beta program details.

## Technical Implementation

### Subscription Status Tracking

#### **Database Schema**
```sql
create table public.subscriber_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                    -- Clerk user ID
  wedding_id uuid references public.weddings(id) on delete set null,
  amount numeric(10,2) not null,
  stripe_payment_intent_id text,
  stripe_session_id text,
  status text not null default 'active' check (status in ('active', 'refunded')),
  purchased_at timestamptz not null default now()
);
```

#### **Subscription status API**
```typescript
// GET /api/subscription-status
{
  "tier": "trialing" | "free" | "pro" | "beta" | "admin",
  "features": {
    "chat": boolean,
    "webSearch": boolean,
    "exportBinder": boolean,
    "emailTemplates": boolean,
    "attachments": boolean,
    "catchUpPlans": boolean,
    "budgetOptimizer": boolean
  },
  "toolCalls": { "used": number, "limit": number | null, "remaining": number | null },
  // Legacy fields (derived from tier, kept for backward compat):
  "hasAccess": boolean,
  "isPaid": boolean,
  "isBeta": boolean,
  "isTrialing": boolean,
  "trialDaysLeft": number,
  "trialExpired": boolean
}
```

### Payment Flow

#### **Stripe Checkout Integration**
1. **Purchase Initiation**: User clicks "Upgrade to Premium" button
2. **Checkout Session**: Create Stripe checkout session with $79 amount
3. **Payment Processing**: Redirect to Stripe-hosted checkout page
4. **Payment Completion**: Stripe processes payment securely
5. **Webhook Notification**: Stripe notifies eydn of successful payment
6. **Account Upgrade**: User account upgraded to premium status
7. **Confirmation**: User redirected back to dashboard with confirmation

#### **Webhook Handling**
```typescript
// POST /api/webhooks/stripe
// Handles: checkout.session.completed
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    await createSubscriberPurchase({
      user_id: session.metadata.user_id,
      stripe_customer_id: session.customer,
      stripe_payment_intent_id: session.payment_intent,
      amount: session.amount_total / 100,
      status: 'succeeded'
    })
  }
}
```

### Access Control

#### **Feature gate enforcement**
New routes use `requireFeature(featureKey)` for per-feature gating. The legacy `requirePremium()` is retained for existing routes.

```typescript
import { requireFeature, requirePremium } from '@/lib/subscription'

// New code — per-feature gate (preferred)
const gate = await requireFeature("catchUpPlans");
if (gate) return gate; // 403 with { error, feature, tier, trialExpired }

// Legacy code — generic gate (backward compat)
const premiumCheck = await requirePremium();
if (premiumCheck) return premiumCheck; // 403 with { error, trialExpired }
```

#### **Collaboration Subscription Inheritance**
```typescript
// Collaborators inherit the wedding owner's subscription status
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  // 1. Check user's direct purchase
  // 2. Check owned wedding trial status
  // 3. Check collaboration and inherit owner's status
  
  if (collab) {
    const wedding = await getWeddingById(collab.wedding_id);
    const ownerPurchase = await getOwnerPurchase(wedding.user_id);
    
    if (ownerPurchase) {
      return { hasAccess: true, isPaid: true, ... };
    }
    
    // Inherit owner's trial status
    return computeTrialStatus(wedding);
  }
}
```

#### **Client-Side Paywall**
```typescript
export function Paywall({ children, feature }: PaywallProps) {
  const { isLoading, isTrialExpired, isPremium } = useSubscription()
  
  if (isLoading) return <LoadingSpinner />
  
  if (isTrialExpired && !isPremium) {
    return <UpgradePrompt feature={feature} />
  }
  
  return children
}
```

## User Experience

### Trial Experience Design

#### **Onboarding Flow**
1. **Sign Up**: Simple email/password registration
2. **Wedding Setup**: Complete onboarding questionnaire
3. **Feature Discovery**: Guided tour of key features
4. **Value Realization**: Complete first few tasks with AI guidance
5. **Engagement**: Daily use throughout trial period
6. **Conversion**: Natural upgrade prompt as trial nears end

#### **Trial Value Demonstration**
- **Progress Tracking**: Show tasks completed and progress made
- **Time Savings**: Highlight time saved vs. manual planning
- **AI Interactions**: Demonstrate value of AI wedding assistant
- **Organization Benefits**: Show consolidated planning in one place
- **Vendor Connections**: Display vendor recommendations and contacts made

### Upgrade Experience

#### **Conversion Triggers**
- **7 Days Remaining**: First gentle reminder about trial ending
- **3 Days Remaining**: More prominent upgrade prompts
- **1 Day Remaining**: Urgent but not aggressive final reminders
- **Trial Expired**: Paywall with clear upgrade path

#### **Upgrade Messaging**
- **Value Focus**: Emphasize value received during trial
- **Progress Preservation**: Highlight that all data will be saved
- **Lifetime Access**: Stress one-time payment for permanent access
- **Comparison**: Show savings vs. hiring wedding planner
- **Urgency**: Gentle urgency without pressure tactics

### Post-Purchase Experience

#### **Immediate Confirmation**
- **Success Page**: Clear confirmation of successful purchase
- **Feature Unlock**: Immediate access to all features
- **Welcome Message**: Personalized congratulations from eydn
- **Next Steps**: Guidance on continuing wedding planning
- **Support Access**: Clear path to customer support if needed

#### **Ongoing Value Delivery**
- **Feature Updates**: Automatic access to new features
- **Continued Support**: Ongoing customer support access
- **Data Preservation**: Permanent storage of wedding data
- **Reference Value**: Access to planning history for future reference

## Revenue Projections

### Financial Model

#### **Year 1 Targets (2026)**
- **Trial Users**: 40,000 signups
- **Conversion Rate**: 25% trial-to-paid
- **Paid Users**: 10,000 customers
- **Revenue**: $790,000 from subscriptions
- **Additional Revenue**: $600,000 from vendor marketplace
- **Total Revenue**: $1,390,000

#### **Year 2 Targets (2027)**
- **Trial Users**: 120,000 signups (3x growth)
- **Conversion Rate**: 28% (improved through optimization)
- **Paid Users**: 33,600 customers
- **Revenue**: $2,654,400 from subscriptions
- **Additional Revenue**: $2,400,000 from vendor marketplace
- **Total Revenue**: $5,054,400

#### **Year 3 Targets (2028)**
- **Trial Users**: 300,000 signups (2.5x growth)
- **Conversion Rate**: 30% (mature conversion optimization)
- **Paid Users**: 90,000 customers
- **Revenue**: $7,110,000 from subscriptions
- **Additional Revenue**: $6,000,000 from vendor marketplace
- **Total Revenue**: $13,110,000

### Unit Economics

#### **Customer Acquisition Cost (CAC)**
- **Target CAC**: $30 per paid customer
- **Acquisition Channels**: Organic search (40%), social media (30%), referrals (20%), paid ads (10%)
- **Payback Period**: Immediate (one-time purchase model)

#### **Customer Lifetime Value (CLV)**
- **Direct Revenue**: $79 per customer
- **Referral Value**: ~$15 per customer (estimated referrals)
- **Vendor Commissions**: ~$25 per customer (future revenue sharing)
- **Total CLV**: ~$119 per customer

#### **Gross Margins**
- **Subscription Revenue**: 95% gross margin (minimal processing fees)
- **Vendor Marketplace**: 90% gross margin (platform fees)
- **Blended Gross Margin**: 92% across all revenue streams

## Competitive Analysis

### Pricing Comparison

#### **Direct Competitors**
- **The Knot**: Free for couples, revenue from vendor advertising
- **WeddingWire**: Free for couples, revenue from vendor subscriptions
- **Zola**: Free for couples, revenue from registry commissions
- **Wedding Planner Plus**: $9.99/month subscription

#### **Indirect Competitors**
- **Professional Wedding Planners**: $3,000-$15,000 total cost
- **Day-of Coordinators**: $800-$2,500 total cost
- **Individual Software Tools**: $10-50/month each for multiple tools

#### **eydn's Competitive Advantage**
- **One-Time Payment**: No recurring fees unlike most SaaS tools
- **Comprehensive Solution**: All-in-one vs. multiple separate tools
- **AI Guidance**: Only platform with dedicated AI wedding assistant
- **Transparent Pricing**: Clear, upfront pricing with no hidden costs
- **Lifetime Value**: Permanent access vs. subscription dependencies

## Conversion Optimization

### A/B Testing Strategy

#### **Trial Length Testing**
- **Current**: 14-day trial
- **Test Variations**: 7-day, 21-day, and 30-day trials
- **Metrics**: Conversion rate, user engagement, feature adoption
- **Hypothesis**: Longer trials may increase conversion through deeper engagement

#### **Pricing Testing**
- **Current**: $79 one-time payment
- **Test Variations**: $69, $89, $99 price points
- **Metrics**: Conversion rate, revenue per customer, user feedback
- **Hypothesis**: Price elasticity testing to optimize revenue

#### **Upgrade Flow Testing**
- **Current**: Paywall with upgrade prompt
- **Test Variations**: Different messaging, timing, and visual design
- **Metrics**: Click-through rate, conversion rate, user sentiment
- **Hypothesis**: Optimized messaging increases conversion rates

### Retention Strategies

#### **Trial Engagement**
- **Onboarding Optimization**: Streamlined setup process
- **Feature Adoption**: Guided tours and feature highlights
- **Progress Tracking**: Visual progress indicators and achievements
- **AI Interaction**: Encourage regular chat with eydn assistant
- **Value Demonstration**: Regular reminders of value provided

#### **Post-Purchase Retention**
- **Feature Updates**: Regular new feature releases
- **Customer Support**: Responsive support throughout planning
- **Community Building**: User community and success stories
- **Referral Programs**: Incentives for referring other couples
- **Lifecycle Marketing**: Relevant content throughout planning journey

## Future Model Evolution

### Potential Pricing Changes (2027+)

#### **Tiered Pricing Introduction**
- **Basic**: $49 (core features only)
- **Premium**: $79 (current full feature set)
- **Pro**: $149 (advanced features + white-label website)

#### **Professional Plans**
- **Wedding Planner Basic**: $29/month (up to 5 active weddings)
- **Wedding Planner Pro**: $99/month (unlimited weddings)
- **Enterprise**: Custom pricing for large agencies

#### **Add-On Services**
- **Premium Support**: $29 one-time for priority support
- **Custom Design**: $99 for custom website themes
- **Data Export**: $19 for comprehensive data export
- **Extended Access**: $29/year after 5 years for continued access

The subscription model is designed to provide exceptional value to couples while building a sustainable, profitable business that can continue to innovate and improve the wedding planning experience.