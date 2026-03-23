import { requireAdmin } from "@/lib/admin";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  ] = await Promise.all([
    supabase.from("weddings").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
    supabase.from("questionnaire_responses").select("*", { count: "exact", head: true }).eq("completed", true),
  ]);

  const withEvents = totalEvents ?? 0;
  const conversionRate = totalCount > 0
    ? Math.round((withEvents / totalCount) * 100)
    : 0;

  return NextResponse.json({
    total_subscribers: totalCount,
    new_signups_7d: recentSignups,
    active_users_7d: activeRecently,
    total_events: withEvents,
    onboarding_completed: onboardingCompleted ?? 0,
    conversion_rate: conversionRate,
    total_ai_chats: totalChatMessages ?? 0,
  });
}
