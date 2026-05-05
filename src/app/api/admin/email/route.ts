import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { sendEmail, getLifecycleEmail } from "@/lib/email";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { safeParseJSON, isParseError, isSafeExternalUrl } from "@/lib/validation";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // Get lifecycle email stats
  const { data: lifecycleEmails } = await supabase
    .from("lifecycle_emails")
    .select("email_type, wedding_id, sent_at")
    .order("sent_at", { ascending: false })
    .limit(100);

  // Count by type
  const emailCounts: Record<string, number> = {};
  for (const e of lifecycleEmails || []) {
    emailCounts[e.email_type] = (emailCounts[e.email_type] || 0) + 1;
  }

  // Get recent emails (last 20)
  const recentEmails = (lifecycleEmails || []).slice(0, 20);

  // Email config status
  const resendConfigured = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Eydn <hello@eydn.app>";

  // Email types and their descriptions
  const emailTypes = [
    { type: "post_wedding_welcome", label: "Post-Wedding Welcome", trigger: "Wedding date passes" },
    { type: "download_reminder_3mo", label: "3-Month Download Reminder", trigger: "3 months post-wedding" },
    { type: "download_reminder_6mo", label: "6-Month Download Reminder", trigger: "6 months post-wedding" },
    { type: "download_reminder_9mo", label: "9-Month Archive Warning", trigger: "9 months post-wedding" },
    { type: "memory_plan_offer", label: "Memory Plan Offer", trigger: "11 months post-wedding" },
    { type: "archive_notice", label: "Archive Notice", trigger: "12 months post-wedding" },
    { type: "sunset_warning_21mo", label: "Sunset Warning", trigger: "21 months post-wedding" },
    { type: "sunset_final", label: "Final Deletion Notice", trigger: "23.5 months post-wedding" },
    { type: "deadline_reminder", label: "Task Deadline Reminder", trigger: "7 days before task due date" },
  ];

  const sb = supabase;

  // Push notification config
  const pushConfigured = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let pushSubscriptionCount = 0;
  if (pushConfigured) {
    const { count } = await sb
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true });
    pushSubscriptionCount = count || 0;
  }

  // SMS (Twilio) config
  const smsConfigured = !!process.env.TWILIO_ACCOUNT_SID;
  const smsFromNumber = process.env.TWILIO_FROM_NUMBER || null;

  // Email tracking config
  const trackingConfigured = !!process.env.RESEND_WEBHOOK_SECRET;
  let totalTrackingEvents = 0;
  if (trackingConfigured) {
    const { count } = await sb
      .from("email_events")
      .select("*", { count: "exact", head: true });
    totalTrackingEvents = count || 0;
  }

  // Notification stats
  const { count: totalNotifications } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true });
  const { count: unreadNotifications } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);
  const { data: notificationRows } = await sb
    .from("notifications")
    .select("type");
  const byType: Record<string, number> = {};
  for (const n of notificationRows || []) {
    byType[n.type] = (byType[n.type] || 0) + 1;
  }

  return NextResponse.json({
    config: {
      resendConfigured,
      fromEmail,
    },
    emailTypes: emailTypes.map((et) => ({
      ...et,
      sent: emailCounts[et.type] || 0,
    })),
    recentEmails,
    totalSent: (lifecycleEmails || []).length,
    pushConfig: { configured: pushConfigured, subscriptionCount: pushSubscriptionCount },
    smsConfig: { configured: smsConfigured, fromNumber: smsFromNumber },
    trackingConfig: { configured: trackingConfigured, totalEvents: totalTrackingEvents },
    notificationStats: {
      total: totalNotifications || 0,
      unread: unreadNotifications || 0,
      byType,
    },
  });
}

/** Send a test email */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rateLimitResult = await checkRateLimit(`admin-email:${ip}`, RATE_LIMITS.auth);
  if (rateLimitResult.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter) } }
    );
  }

  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const action = (body.action as string) || "test_email";

  // Handle test SMS
  if (action === "test_sms") {
    const to = body.to as string | undefined;
    const message = (body.message as string) || "Test SMS from Eydn admin";
    if (!to) {
      return NextResponse.json({ error: "to phone number is required" }, { status: 400 });
    }
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
      return NextResponse.json({ error: "Twilio is not configured" }, { status: 400 });
    }
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const params = new URLSearchParams({
        To: to,
        From: process.env.TWILIO_FROM_NUMBER,
        Body: message,
      });
      const smsRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const smsData = await smsRes.json();
      if (!smsRes.ok) {
        return NextResponse.json({ success: false, error: smsData.message || "Failed to send SMS" });
      }
      return NextResponse.json({ success: true, sid: smsData.sid });
    } catch {
      return NextResponse.json({ success: false, error: "SMS send failed" });
    }
  }

  // Handle test push notification
  if (action === "test_push") {
    const { supabase: adminSupabase, userId } = result;
    // Get admin's wedding
    const { data: wedding } = await adminSupabase
      .from("weddings")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    if (!wedding) {
      return NextResponse.json({ error: "No wedding found for admin user" }, { status: 400 });
    }
    // Get all push subscriptions for this wedding
    const { data: subscriptions } = await adminSupabase
      .from("push_subscriptions")
      .select("*")
      .eq("wedding_id", wedding.id);
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: "No push subscriptions found" }, { status: 400 });
    }
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPrivateKey || !vapidPublicKey) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 400 });
    }
    // We send a simple JSON payload to each subscription endpoint
    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      try {
        const endpoint = (sub.subscription as Record<string, unknown>)?.endpoint as string;
        if (!isSafeExternalUrl(endpoint)) {
          failed++;
          continue;
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Eydn Test Push",
            body: "This is a test push notification from the admin panel.",
          }),
        });
        if (res.ok || res.status === 201) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    return NextResponse.json({ success: true, sent, failed, total: subscriptions.length });
  }

  // Default: test_email
  const to = body.to as string | undefined;
  const templateType = body.templateType as string | undefined;

  if (!to || !templateType) {
    return NextResponse.json({ error: "to and templateType are required" }, { status: 400 });
  }

  // Generate a test email from the template
  const emailContent = getLifecycleEmail(templateType, {
    partnerNames: "Test Partner 1 & Test Partner 2",
    weddingDate: "2026-06-15",
  });

  if (!emailContent) {
    // If it's a deadline reminder, use a custom test
    if (templateType === "deadline_reminder") {
      const result = await sendEmail({
        to,
        category: "transactional",
        subject: "Test: Task Deadline Reminder",
        html: `
          <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
              <img src="https://eydn.app/logo-white.png" alt="Eydn" height="34" style="height: 34px; width: auto;" />
            </div>
            <div style="padding: 32px; color: #1A1A2E; font-size: 15px; line-height: 1.7;">
              <h2 style="color: #1A1A2E; font-size: 20px;">Upcoming deadlines this week</h2>
              <p>Hi Test! You have 2 tasks coming up:</p>
              <ul style="padding-left: 20px;">
                <li><strong>Book Photographer</strong> — due 2026-06-20</li>
                <li><strong>Send Invitations</strong> — due 2026-06-22</li>
              </ul>
              <p style="text-align: center; margin-top: 24px;">
                <a href="https://eydn.app/dashboard/tasks" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">View Tasks</a>
              </p>
              <p style="margin-top: 16px; text-align: center; color: #6B6B6B; font-size: 12px;">[TEST EMAIL — This is a preview from the admin panel]</p>
            </div>
          </div>
        `,
      });
      return NextResponse.json({ success: result.success, error: result.error });
    }
    return NextResponse.json({ error: "Unknown template type" }, { status: 400 });
  }

  // Add test badge to subject
  const testSubject = `[TEST] ${emailContent.subject}`;
  const testHtml = emailContent.html.replace(
    "</div>\n      </div>",
    `<p style="margin-top: 16px; text-align: center; color: #6B6B6B; font-size: 12px;">[TEST EMAIL — This is a preview from the admin panel]</p></div>\n      </div>`
  );

  // Admin test send — always go through, regardless of cap.
  const sendResult = await sendEmail({
    to,
    category: "transactional",
    subject: testSubject,
    html: testHtml,
  });
  return NextResponse.json({ success: sendResult.success, error: sendResult.error });
}
