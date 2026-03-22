import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { sendEmail, getLifecycleEmail } from "@/lib/email";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

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
  const fromEmail = process.env.RESEND_FROM_EMAIL || "eydn <hello@eydn.app>";

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

  const body = await request.json();
  const { to, templateType } = body;

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
        subject: "Test: Task Deadline Reminder",
        html: `
          <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; font-size: 24px; margin: 0;">eydn</h1>
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

  const sendResult = await sendEmail({ to, subject: testSubject, html: testHtml });
  return NextResponse.json({ success: sendResult.success, error: sendResult.error });
}
