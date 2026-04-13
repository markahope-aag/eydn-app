import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { captureServer } from "@/lib/analytics-server";

const TRIAL_DAYS = 14;

/**
 * Nightly cron: emits a `trial_expired_auto_downgrade` event to PostHog for every
 * user whose 14-day trial ended in the last 24 hours and who has no active paid plan.
 *
 * This lets PostHog measure downgrade volume without a schema change — the actual
 * access gate is already time-based in src/lib/subscription.ts.
 *
 * Schedule: 0 6 * * * (daily at 6 AM UTC)
 * Auth: Bearer BACKUP_SECRET
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.BACKUP_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const now = Date.now();
  const windowEnd = new Date(now - TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

  const { data: weddings, error } = await supabase
    .from("weddings")
    .select("id, user_id, trial_started_at, created_at")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let emitted = 0;
  for (const w of (weddings || []) as Array<{
    id: string;
    user_id: string;
    trial_started_at: string | null;
    created_at: string;
  }>) {
    const { data: purchase } = await supabase
      .from("subscriber_purchases")
      .select("id")
      .eq("user_id", w.user_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (purchase) continue;

    await captureServer(w.user_id, "trial_expired_auto_downgrade", {
      wedding_id: w.id,
      trial_started_at: w.trial_started_at || w.created_at,
    });
    emitted++;
  }

  return NextResponse.json({ ok: true, emitted });
}
