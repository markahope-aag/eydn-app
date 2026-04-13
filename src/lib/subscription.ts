import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TRIAL_DAYS = 14;
const PRICE = 79;
const PRO_MONTHLY = 14.99;

export { PRICE as SUBSCRIPTION_PRICE, PRO_MONTHLY as PRO_MONTHLY_PRICE };

// Explicit tier — source of truth for everything downstream. All legacy
// boolean fields on SubscriptionStatus are derived from this.
export type Tier = "trialing" | "free" | "pro" | "beta" | "admin";

// Per-feature gates. Callers should prefer these over the legacy
// hasAccess boolean. See project_pricing_model.md for the full matrix.
export type FeatureKey =
  | "chat"           // POST /api/chat (free tier will become capped in #6)
  | "webSearch"      // web_search tool inside the chat loop (Pro-only)
  | "exportBinder"   // Day-of binder PDF export
  | "emailTemplates" // Vendor email templates
  | "attachments"    // Attachments on real entities (tasks, vendors)
  | "catchUpPlans"   // AI catch-up plans (task #7)
  | "budgetOptimizer"; // AI budget optimizer (task #8)

export type Features = Record<FeatureKey, boolean>;

export type SubscriptionStatus = {
  tier: Tier;
  features: Features;

  // Legacy fields — derived from tier, kept for backward compat during the
  // migration from the old hasAccess-boolean model. Prefer `tier` and
  // `features` in new code.
  hasAccess: boolean;
  isPaid: boolean;
  isBeta: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
};

// Feature map per tier. Free tier can chat (the cap is enforced separately
// in the /api/chat route via tool-call-counter.ts); everything else is
// gated. Trial, Pro, Beta, and Admin get full access to every feature.
const ALL_ON: Features = {
  chat: true,
  webSearch: true,
  exportBinder: true,
  emailTemplates: true,
  attachments: true,
  catchUpPlans: true,
  budgetOptimizer: true,
};

const FREE_FEATURES: Features = {
  chat: true, // Capped per-user per-month — see src/lib/tool-call-counter.ts
  webSearch: false,
  exportBinder: false,
  emailTemplates: false,
  attachments: false,
  catchUpPlans: false,
  budgetOptimizer: false,
};

const TIER_FEATURES: Record<Tier, Features> = {
  trialing: ALL_ON,
  free: FREE_FEATURES,
  pro: ALL_ON,
  beta: ALL_ON,
  admin: ALL_ON,
};

function deriveStatus(tier: Tier, trialDaysLeft = 0): SubscriptionStatus {
  return {
    tier,
    features: TIER_FEATURES[tier],
    hasAccess: tier !== "free",
    isPaid: tier === "pro" || tier === "beta" || tier === "admin",
    isBeta: tier === "beta",
    isTrialing: tier === "trialing",
    trialDaysLeft,
    trialExpired: tier === "free",
  };
}

/**
 * Guard for API routes that require a specific premium feature. Returns
 * null if the caller has access, or a 403 NextResponse otherwise.
 */
export async function requireFeature(feature: FeatureKey): Promise<NextResponse | null> {
  const status = await getSubscriptionStatus();
  if (status.features[feature]) return null;
  return NextResponse.json(
    {
      error: "Premium feature — upgrade to continue",
      feature,
      tier: status.tier,
      trialExpired: status.trialExpired,
    },
    { status: 403 }
  );
}

/**
 * Backward-compat alias for the old boolean gate. Prefer `requireFeature`
 * in new code.
 */
export async function requirePremium(): Promise<NextResponse | null> {
  const status = await getSubscriptionStatus();
  if (status.hasAccess) return null;
  return NextResponse.json(
    { error: "Premium feature — upgrade to continue", trialExpired: status.trialExpired },
    { status: 403 }
  );
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const { userId } = await auth();
  if (!userId) return deriveStatus("free");

  const supabase = createSupabaseAdmin();

  // Admin and beta users always have full access
  const { data: privilegedRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "beta"])
    .limit(1)
    .single();

  if (privilegedRole) {
    const role = (privilegedRole as { role: string }).role;
    return deriveStatus(role === "beta" ? "beta" : "admin");
  }

  // Check for active purchase by this user
  const { data: purchase } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (purchase) return deriveStatus("pro");

  // Check trial status from owned wedding
  const { data: ownedWedding } = await supabase
    .from("weddings")
    .select("user_id, trial_started_at, created_at")
    .eq("user_id", userId)
    .single();

  if (ownedWedding) {
    return computeTrialStatus(ownedWedding as { trial_started_at: string | null; created_at: string });
  }

  // No owned wedding — check if collaborator and inherit owner's status
  const { data: collab } = await supabase
    .from("wedding_collaborators")
    .select("wedding_id")
    .eq("user_id", userId)
    .eq("invite_status", "accepted")
    .limit(1)
    .single();

  if (collab) {
    const { data: wedding } = await supabase
      .from("weddings")
      .select("user_id, trial_started_at, created_at")
      .eq("id", collab.wedding_id)
      .single();

    if (wedding) {
      const { data: ownerPurchase } = await supabase
        .from("subscriber_purchases")
        .select("id")
        .eq("user_id", (wedding as { user_id: string }).user_id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (ownerPurchase) return deriveStatus("pro");
      return computeTrialStatus(wedding as { trial_started_at: string | null; created_at: string });
    }
  }

  return deriveStatus("free");
}

function computeTrialStatus(wedding: { trial_started_at: string | null; created_at: string }): SubscriptionStatus {
  const trialStart = new Date(wedding.trial_started_at || wedding.created_at);
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysLeft > 0) return deriveStatus("trialing", daysLeft);
  return deriveStatus("free");
}
