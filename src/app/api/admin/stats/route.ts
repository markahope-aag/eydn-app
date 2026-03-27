import { requireAdmin } from "@/lib/admin";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const TRIAL_DAYS = 14;

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const client = await clerkClient();

  // Paginate through all Clerk users to get accurate counts
  const allUsers: Array<{ createdAt: number; lastSignInAt: number | null }> = [];
  let offset = 0;
  const pageSize = 500;
  let totalCount = 0;

  let hasMore = true;
  while (hasMore) {
    const page = await client.users.getUserList({ limit: pageSize, offset });
    totalCount = page.totalCount;
    for (const u of page.data) {
      allUsers.push({ createdAt: u.createdAt, lastSignInAt: u.lastSignInAt });
    }
    if (allUsers.length >= totalCount || page.data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSignups = allUsers.filter((u) => u.createdAt > sevenDaysAgo).length;
  const activeRecently = allUsers.filter(
    (u) => u.lastSignInAt && u.lastSignInAt > sevenDaysAgo
  ).length;

  const [
    { count: totalEvents },
    { count: totalChatMessages },
    { count: onboardingCompleted },
    { count: paidCount },
    { data: weddingsData },
  ] = await Promise.all([
    supabase.from("weddings").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
    supabase.from("questionnaire_responses").select("*", { count: "exact", head: true }).eq("completed", true),
    supabase.from("subscriber_purchases").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("weddings").select("trial_started_at, created_at"),
  ]);

  // Calculate trial metrics
  const now = new Date();
  const weddings = (weddingsData || []) as Array<{ trial_started_at: string | null; created_at: string }>;
  let trialsActive = 0;
  let trialsExpired = 0;

  for (const w of weddings) {
    const trialStart = new Date(w.trial_started_at || w.created_at);
    const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    if (now < trialEnd) {
      trialsActive++;
    } else {
      trialsExpired++;
    }
  }

  // Expired trials that didn't convert = expired - paid
  const paid = paidCount ?? 0;
  const trialsExpiredUnconverted = Math.max(0, trialsExpired - paid);

  const withEvents = totalEvents ?? 0;
  const conversionRate = totalCount > 0
    ? Math.round((withEvents / totalCount) * 100)
    : 0;

  // Conversion rate: paid / total weddings (trials started)
  const paidConversionRate = withEvents > 0
    ? Math.round((paid / withEvents) * 100)
    : 0;

  return NextResponse.json({
    total_subscribers: totalCount,
    new_signups_7d: recentSignups,
    active_users_7d: activeRecently,
    total_events: withEvents,
    onboarding_completed: onboardingCompleted ?? 0,
    conversion_rate: conversionRate,
    total_ai_chats: totalChatMessages ?? 0,
    // Subscription funnel
    trials_active: trialsActive,
    trials_expired_unconverted: trialsExpiredUnconverted,
    paid_subscriptions: paid,
    paid_conversion_rate: paidConversionRate,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
