import { requireAdmin } from "@/lib/admin";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({ limit: 100 });

  // Signups in last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSignups = clerkUsers.data.filter(
    (u) => u.createdAt > sevenDaysAgo
  ).length;

  // Active in last 7 days (signed in)
  const activeRecently = clerkUsers.data.filter(
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

  const totalSubscribers = clerkUsers.data.length;
  const withEvents = totalEvents ?? 0;
  const conversionRate = totalSubscribers > 0
    ? Math.round((withEvents / totalSubscribers) * 100)
    : 0;

  return NextResponse.json({
    total_subscribers: totalSubscribers,
    new_signups_7d: recentSignups,
    active_users_7d: activeRecently,
    total_events: withEvents,
    onboarding_completed: onboardingCompleted ?? 0,
    conversion_rate: conversionRate,
    total_ai_chats: totalChatMessages ?? 0,
  });
}
