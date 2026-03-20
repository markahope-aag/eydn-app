import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const TRIAL_DAYS = 14;
const PRICE = 79;

export { PRICE as SUBSCRIPTION_PRICE };

export type SubscriptionStatus = {
  hasAccess: boolean;
  isPaid: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
};

/**
 * Check if the current user has access to premium features.
 * Premium features: AI chat, PDF export, file attachments.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const { userId } = await auth();
  if (!userId) {
    return { hasAccess: false, isPaid: false, isTrialing: false, trialDaysLeft: 0, trialExpired: true };
  }

  const supabase = createSupabaseAdmin();

  // Check for active purchase
  const { data: purchase } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (purchase) {
    return { hasAccess: true, isPaid: true, isTrialing: false, trialDaysLeft: 0, trialExpired: false };
  }

  // Check trial status
  const { data: wedding } = await supabase
    .from("weddings")
    .select("trial_started_at, created_at")
    .eq("user_id", userId)
    .single();

  if (!wedding) {
    return { hasAccess: true, isPaid: false, isTrialing: true, trialDaysLeft: TRIAL_DAYS, trialExpired: false };
  }

  const trialStart = new Date((wedding as { trial_started_at: string | null; created_at: string }).trial_started_at || (wedding as { created_at: string }).created_at);
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysLeft > 0) {
    return { hasAccess: true, isPaid: false, isTrialing: true, trialDaysLeft: daysLeft, trialExpired: false };
  }

  return { hasAccess: false, isPaid: false, isTrialing: false, trialDaysLeft: 0, trialExpired: true };
}
