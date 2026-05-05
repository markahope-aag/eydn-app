/**
 * Daily cron: send the 3-day trial-expiry reminder.
 *
 * Finds weddings whose trial is ending in ~3 days (trial_started_at
 * between 10-12 days ago), skips paid / beta / admin users, respects
 * lifecycle_emails + unsubscribed_all preferences, sends the reminder
 * via Resend, and records trial_reminder_sent_at as a dedupe key so
 * the same couple never gets emailed twice.
 *
 * Cron secret is shared with the other cron routes — vercel.json
 * registers this path on a daily schedule.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logCronExecution } from "@/lib/cron-logger";
import { sendEmail } from "@/lib/email";
import { getEmailPreferences, emailFooterHtml } from "@/lib/email-preferences";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { escapeHtml } from "@/lib/validation";
import { requireCronAuth } from "@/lib/cron-auth";

const TRIAL_DAYS = 14;
/** Send the reminder when trial has 3 days left — i.e. trial started 11 days ago.
 *  The ± 1 day window catches the cron missing a day without double-sending.
 */
const REMINDER_WINDOW_MIN_DAYS = 10;
const REMINDER_WINDOW_MAX_DAYS = 12;

function buildReminderEmail(params: {
  partner1: string | null;
  partner2: string | null;
  daysLeft: number;
  unsubscribeToken: string;
}): { subject: string; html: string } {
  const { partner1, partner2, daysLeft, unsubscribeToken } = params;
  const greeting = partner1 ? escapeHtml(partner1) : "there";
  const couple = partner1 && partner2 ? `${escapeHtml(partner1)} & ${escapeHtml(partner2)}` : greeting;

  const subject =
    daysLeft === 1
      ? "1 day left in your Eydn trial"
      : `${daysLeft} days left in your Eydn trial`;

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#2A2018;">
      <h1 style="font-size:24px;font-weight:600;color:#3D2C3E;margin:0 0 16px;">
        Hey ${greeting} — your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}
      </h1>
      <p style="font-size:16px;line-height:1.6;color:#2A2018;margin:0 0 16px;">
        You've had the full Eydn experience for 11 days now: AI chat with your
        whole wedding context, your personalized task timeline, day-of binder
        export, vendor email templates — everything.
      </p>
      <p style="font-size:16px;line-height:1.6;color:#2A2018;margin:0 0 24px;">
        Upgrade to Pro once ($79) and it's yours through the wedding day. No
        subscription, no expiry — just keep the planner you've already started
        building with ${couple}.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://eydn.app/dashboard/pricing"
           style="display:inline-block;background:#6B4E8B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:600;">
          Upgrade to Pro — $79
        </a>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#6B5E50;margin:0 0 8px;">
        If you don't upgrade, you'll move to the free plan — your guest list,
        budget, and task timeline stay yours. You'll just lose unlimited AI
        chat, the day-of binder, and vendor email templates.
      </p>
      ${emailFooterHtml(unsubscribeToken, "lifecycle")}
    </div>
  `;

  return { subject, html };
}

type Wedding = {
  id: string;
  user_id: string;
  partner1_name: string | null;
  partner2_name: string | null;
  trial_started_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  let candidatesConsidered = 0;
  let emailsSent = 0;
  let skippedPaid = 0;
  let skippedPrivileged = 0;
  let skippedUnsubscribed = 0;
  let skippedNoEmail = 0;
  let skippedDailyCap = 0;
  let errors = 0;

  try {
    const now = Date.now();
    const minAgoMs = REMINDER_WINDOW_MIN_DAYS * 24 * 60 * 60 * 1000;
    const maxAgoMs = REMINDER_WINDOW_MAX_DAYS * 24 * 60 * 60 * 1000;
    const windowEnd = new Date(now - minAgoMs).toISOString();
    const windowStart = new Date(now - maxAgoMs).toISOString();

    // Candidates: weddings whose trial started inside the window and haven't
    // been emailed yet. We intentionally use trial_started_at only here —
    // computeTrialStatus falls back to created_at at the app layer, but for
    // the cron it's cleaner to require an explicit trial start.
    const { data: candidates } = await supabase
      .from("weddings")
      .select("id, user_id, partner1_name, partner2_name, trial_started_at, created_at")
      .is("trial_reminder_sent_at", null)
      .gte("trial_started_at", windowStart)
      .lte("trial_started_at", windowEnd);

    // Also grab weddings with a null trial_started_at but a created_at in
    // the window — same semantics as the app-side trial calculation.
    const { data: fallbackCandidates } = await supabase
      .from("weddings")
      .select("id, user_id, partner1_name, partner2_name, trial_started_at, created_at")
      .is("trial_reminder_sent_at", null)
      .is("trial_started_at", null)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd);

    const allCandidates = [
      ...((candidates ?? []) as Wedding[]),
      ...((fallbackCandidates ?? []) as Wedding[]),
    ];
    candidatesConsidered = allCandidates.length;

    const clerk = await clerkClient();

    for (const wedding of allCandidates) {
      // Skip if the user has an active purchase.
      const { data: purchase } = await supabase
        .from("subscriber_purchases")
        .select("id")
        .eq("user_id", wedding.user_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (purchase) {
        skippedPaid++;
        continue;
      }

      // Skip if the user is admin or beta (full access, no expiry).
      const { data: privileged } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", wedding.user_id)
        .in("role", ["admin", "beta"])
        .limit(1)
        .maybeSingle();
      if (privileged) {
        skippedPrivileged++;
        continue;
      }

      // Respect email preferences. Lifecycle_emails is the right category
      // for trial/subscription lifecycle nudges.
      const prefs = await getEmailPreferences(wedding.id);
      if (prefs.unsubscribed_all || !prefs.lifecycle_emails) {
        skippedUnsubscribed++;
        continue;
      }

      // Look up the user's primary email via Clerk.
      let email: string | null = null;
      try {
        const user = await clerk.users.getUser(wedding.user_id);
        email = user.primaryEmailAddress?.emailAddress ?? null;
      } catch {
        email = null;
      }
      if (!email) {
        skippedNoEmail++;
        continue;
      }

      // Compute days left so the subject/body reflect reality (3 is the
      // target but the cron window is 2-4).
      const startDate = new Date(wedding.trial_started_at || wedding.created_at);
      const trialEndMs = startDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(1, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24)));

      const { subject, html } = buildReminderEmail({
        partner1: wedding.partner1_name,
        partner2: wedding.partner2_name,
        daysLeft,
        unsubscribeToken: prefs.unsubscribe_token,
      });

      const sendResult = await sendEmail({
        to: email,
        subject,
        html,
        category: "lifecycle",
        userId: wedding.user_id,
      });

      // Daily cap hit — leave trial_reminder_sent_at null so we retry the
      // candidate on the next cron pass once the recipient's 24h window has
      // elapsed. Counts as deferred, not an error.
      if (sendResult.skipped === "daily_cap") {
        skippedDailyCap++;
        continue;
      }

      if (!sendResult.success) {
        errors++;
        continue;
      }

      // Mark as sent so we never double-email this couple.
      await supabase
        .from("weddings")
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq("id", wedding.id);

      emailsSent++;
    }

    const durationMs = Date.now() - startTime;
    await logCronExecution({
      jobName: "trial-reminders",
      status: "success",
      durationMs,
      details: {
        candidatesConsidered,
        emailsSent,
        errors,
        skippedPaid,
        skippedPrivileged,
        skippedUnsubscribed,
        skippedNoEmail,
        skippedDailyCap,
      },
    });

    return NextResponse.json({
      ok: true,
      candidatesConsidered,
      emailsSent,
      skippedPaid,
      skippedPrivileged,
      skippedUnsubscribed,
      skippedNoEmail,
      skippedDailyCap,
      errors,
    });
  } catch (err) {
    console.error("[trial-reminders] failed:", err);
    await logCronExecution({
      jobName: "trial-reminders",
      status: "error",
      durationMs: Date.now() - startTime,
      details: { candidatesConsidered, emailsSent },
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
