import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // AI stats queries
  const [
    { count: totalMessages },
    { count: messagesLast7d },
    { count: messagesLast30d },
    { data: uniqueWeddingsData },
  ] = await Promise.all([
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("chat_messages").select("wedding_id"),
  ]);

  const uniqueWeddingIds = new Set(
    (uniqueWeddingsData ?? []).map((r: { wedding_id: string }) => r.wedding_id)
  );
  const uniqueWeddingsUsing = uniqueWeddingIds.size;
  const total = totalMessages ?? 0;
  const averagePerWedding = uniqueWeddingsUsing > 0
    ? Math.round((total / uniqueWeddingsUsing) * 10) / 10
    : 0;

  // Connection configuration checks
  const connections = {
    supabase: { configured: true, status: "connected" as const },
    clerk: { configured: !!process.env.CLERK_SECRET_KEY },
    resend: { configured: !!process.env.RESEND_API_KEY },
    twilio: { configured: !!process.env.TWILIO_ACCOUNT_SID },
    stripe: { configured: !!process.env.STRIPE_SECRET_KEY },
    anthropic: { configured: !!process.env.ANTHROPIC_API_KEY },
    googlePlaces: { configured: !!process.env.GOOGLE_PLACES_API_KEY },
    sentry: { configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN },
    vapid: { configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY },
  };

  // Email health queries
  const [
    { count: sentLast7d },
    { count: bouncesLast7d },
    { count: complaintsLast7d },
  ] = await Promise.all([
    sb.from("email_events").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    sb.from("email_events").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo).eq("event_type", "bounced"),
    sb.from("email_events").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo).eq("event_type", "complained"),
  ]);

  const sent = sentLast7d ?? 0;
  const bounces = bouncesLast7d ?? 0;
  const complaints = complaintsLast7d ?? 0;
  const deliveryRate = sent > 0
    ? Math.round(((sent - bounces) / sent) * 1000) / 10
    : 100;

  return NextResponse.json({
    ai: {
      totalMessages: total,
      messagesLast7d: messagesLast7d ?? 0,
      messagesLast30d: messagesLast30d ?? 0,
      uniqueWeddingsUsing,
      averagePerWedding,
    },
    connections,
    emailHealth: {
      sentLast7d: sent,
      bouncesLast7d: bounces,
      complaintsLast7d: complaints,
      deliveryRate,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
