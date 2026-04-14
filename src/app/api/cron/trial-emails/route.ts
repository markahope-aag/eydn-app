import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { clerkClient } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";
import { getTrialEmail, type TrialEmailType } from "@/lib/email-trial";
import { captureServer } from "@/lib/analytics-server";
import { requireCronAuth } from "@/lib/cron-auth";

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type WeddingRow = {
  id: string;
  user_id: string;
  partner1_name: string | null;
  trial_started_at: string | null;
  created_at: string;
};

/**
 * Daily cron: sends trial-expiry emails based on trial day and card-on-file status.
 *
 *   day 10 (4 days left)  → day_10_save_card to users WITHOUT a pending scheduled row
 *   day 14 morning        → day_14_renews_today to users WITH a pending scheduled row
 *   day 14 (trial ended)  → day_14_downgraded to users WITHOUT a pending scheduled row
 *
 * Dedup via trial_email_log (user_id + email_type is a primary key).
 *
 * Schedule: 0 14 * * * (daily 14:00 UTC / 10 AM ET)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper)
 */
export async function POST(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const now = Date.now();

  async function sendFor(
    trialDay: number,
    emailType: TrialEmailType,
    requireCardSaved: boolean
  ): Promise<number> {
    const targetTrialStart = new Date(now - trialDay * DAY_MS);
    const rangeStart = new Date(targetTrialStart.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const rangeEnd = new Date(targetTrialStart.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const { data: weddings } = await supabase
      .from("weddings")
      .select("id, user_id, partner1_name, trial_started_at, created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd);

    let sent = 0;
    for (const w of (weddings || []) as WeddingRow[]) {
      // Skip already paid
      const { data: purchase } = await supabase
        .from("subscriber_purchases")
        .select("id")
        .eq("user_id", w.user_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (purchase) continue;

      // Check for pending scheduled subscription (card saved)
      const { data: scheduled } = await supabase
        .from("scheduled_subscriptions")
        .select("id")
        .eq("user_id", w.user_id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      const hasCard = Boolean(scheduled);
      if (requireCardSaved !== hasCard) continue;

      // Dedupe
      const { data: alreadySent } = await supabase
        .from("trial_email_log")
        .select("user_id")
        .eq("user_id", w.user_id)
        .eq("email_type", emailType)
        .maybeSingle();
      if (alreadySent) continue;

      // Resolve email
      let recipientEmail: string | null = null;
      try {
        const clerk = await clerkClient();
        const u = await clerk.users.getUser(w.user_id);
        recipientEmail = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress || null;
      } catch {
        continue;
      }
      if (!recipientEmail) continue;

      const trialStart = new Date(w.trial_started_at || w.created_at);
      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * DAY_MS).toISOString();

      const template = getTrialEmail(emailType, {
        partner1Name: w.partner1_name || "there",
        trialEndsAt: trialEnd,
      });

      const result = await sendEmail({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
      });

      if (result.success) {
        await supabase.from("trial_email_log").insert({
          user_id: w.user_id,
          email_type: emailType,
        });
        await captureServer(w.user_id, "trial_email_sent", { email_type: emailType });
        sent++;
      }
    }
    return sent;
  }

  const day10 = await sendFor(10, "day_10_save_card", false);
  const day14RenewsToday = await sendFor(14, "day_14_renews_today", true);
  const day14Downgraded = await sendFor(14, "day_14_downgraded", false);

  return NextResponse.json({
    ok: true,
    day_10_save_card: day10,
    day_14_renews_today: day14RenewsToday,
    day_14_downgraded: day14Downgraded,
  });
}
