import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { clerkClient } from "@clerk/nextjs/server";
import { runSequenceForRecipient } from "@/lib/email-sequences";
import { captureServer } from "@/lib/analytics-server";
import { requireCronAuth } from "@/lib/cron-auth";

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

const STEP_TO_LEGACY_TYPE: Record<number, string> = {
  10: "day_10_save_card",
  14: "day_14_renews_today",
  15: "day_14_downgraded",
};

/**
 * Daily cron: drives the `trial_expiry` sequence (DB-defined in
 * email_sequences/email_sequence_steps). The sequence picks up Day 10 and
 * Day 14 emails based on `trial_started_at` and per-step audience filters
 * (`has_card_saved` true/false) — see the seed migration for the step list.
 *
 * We mirror successful sends to the legacy `trial_email_log` table during the
 * Phase 1 transition so existing admin queries keep working. Once the admin
 * surface reads from `sequence_send_log` directly, the mirror can be dropped.
 *
 * Schedule: 0 14 * * * (daily 14:00 UTC / 10 AM ET)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper)
 */
export async function POST(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - (TRIAL_DAYS + 1) * DAY_MS).toISOString();

  // Candidate window: any wedding whose trial could plausibly still be in scope.
  const { data: weddings } = await supabase
    .from("weddings")
    .select("id, user_id, partner1_name, trial_started_at, created_at")
    .gte("created_at", windowStart);

  let totalSent = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const w of weddings || []) {
    if (!w.user_id) continue;

    // Skip already paid: an active subscription means they're past the trial flow.
    const { data: purchase } = await supabase
      .from("subscriber_purchases")
      .select("id")
      .eq("user_id", w.user_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (purchase) continue;

    // Has a card been saved (= scheduled subscription pending)?
    const { data: scheduled } = await supabase
      .from("scheduled_subscriptions")
      .select("id")
      .eq("user_id", w.user_id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    const hasCardSaved = Boolean(scheduled);

    // Resolve email + first name.
    let recipientEmail: string | null = null;
    try {
      const clerk = await clerkClient();
      const u = await clerk.users.getUser(w.user_id);
      recipientEmail =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress || null;
    } catch {
      continue;
    }
    if (!recipientEmail) continue;

    const trialStart = new Date(w.trial_started_at || w.created_at);
    const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * DAY_MS);
    const firstName = (w.partner1_name || "").split(" ")[0] || "there";
    const endsOn = trialEnd.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const result = await runSequenceForRecipient("trial_expiry", {
      userId: w.user_id,
      weddingId: w.id,
      email: recipientEmail,
      attrs: { has_card_saved: hasCardSaved },
      templateContext: {
        firstName,
        endsOn,
        appUrl: APP_URL,
        // day_14_renews_today expects a card description; pull last4 from the
        // scheduled subscription if available, otherwise fall back to a generic phrase.
        cardDescription: hasCardSaved ? "Your card on file" : "",
      },
      anchor: trialStart,
    });

    totalSent += result.sent;
    totalSkipped += result.skippedAudience + result.skippedUnsubscribed;
    errors.push(...result.errors);

    // Mirror successful sends to legacy table for backward compat.
    for (const step of result.sentSteps) {
      const legacyType = STEP_TO_LEGACY_TYPE[step.stepOrder];
      if (!legacyType) continue;
      await supabase
        .from("trial_email_log")
        .upsert(
          { user_id: w.user_id, email_type: legacyType },
          { onConflict: "user_id,email_type", ignoreDuplicates: true }
        );
      await captureServer(w.user_id, "trial_email_sent", { email_type: legacyType });
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    skipped: totalSkipped,
    errors: errors.length ? errors : undefined,
  });
}
