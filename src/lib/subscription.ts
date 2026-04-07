import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TRIAL_DAYS = 14;
const PRICE = 79;

export { PRICE as SUBSCRIPTION_PRICE };

export type SubscriptionStatus = {
  hasAccess: boolean;
  isPaid: boolean;
  isBeta: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
};

/**
 * Guard for premium API routes. Returns null if the user has access,
 * or a 403 NextResponse if they don't.
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
  if (!userId) {
    return { hasAccess: false, isPaid: false, isBeta: false, isTrialing: false, trialDaysLeft: 0, trialExpired: true };
  }

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
    const isBeta = (privilegedRole as { role: string }).role === "beta";
    return { hasAccess: true, isPaid: true, isBeta, isTrialing: false, trialDaysLeft: 0, trialExpired: false };
  }

  // Check for active purchase by this user
  const { data: purchase } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (purchase) {
    return { hasAccess: true, isPaid: true, isBeta: false, isTrialing: false, trialDaysLeft: 0, trialExpired: false };
  }

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
    // Get the wedding to find the owner
    const { data: wedding } = await supabase
      .from("weddings")
      .select("user_id, trial_started_at, created_at")
      .eq("id", collab.wedding_id)
      .single();

    if (wedding) {
      // Check if the OWNER has an active purchase
      const { data: ownerPurchase } = await supabase
        .from("subscriber_purchases")
        .select("id")
        .eq("user_id", (wedding as { user_id: string }).user_id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (ownerPurchase) {
        return { hasAccess: true, isPaid: true, isBeta: false, isTrialing: false, trialDaysLeft: 0, trialExpired: false };
      }

      // Inherit the owner's trial status
      return computeTrialStatus(wedding as { trial_started_at: string | null; created_at: string });
    }
  }

  // No owned wedding and no collaboration — no access
  return { hasAccess: false, isPaid: false, isBeta: false, isTrialing: false, trialDaysLeft: 0, trialExpired: true };
}

function computeTrialStatus(wedding: { trial_started_at: string | null; created_at: string }): SubscriptionStatus {
  const trialStart = new Date(wedding.trial_started_at || wedding.created_at);
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysLeft > 0) {
    return { hasAccess: true, isPaid: false, isBeta: false, isTrialing: true, trialDaysLeft: daysLeft, trialExpired: false };
  }

  return { hasAccess: false, isPaid: false, isBeta: false, isTrialing: false, trialDaysLeft: 0, trialExpired: true };
}
