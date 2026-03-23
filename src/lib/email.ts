import { Resend } from "resend";
import { escapeHtml } from "@/lib/validation";
import { emailFooterHtml } from "@/lib/email-preferences";

let client: Resend | null = null;

function getResend(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

const FROM = process.env.RESEND_FROM_EMAIL || "eydn <hello@eydn.app>";

type EmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { success: true };
  } catch (error) {
    console.error("[EMAIL] Send failed:", error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Lifecycle email templates.
 * Each returns { subject, html } for the given wedding data.
 */
export function getLifecycleEmail(
  emailType: string,
  data: { partnerNames: string; weddingDate: string; daysUntilArchive?: number; exportUrl?: string; unsubscribeToken?: string }
): { subject: string; html: string } | null {
  const partnerNames = escapeHtml(data.partnerNames);
  const dateFormatted = escapeHtml(
    new Date(data.weddingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  );

  const header = `
    <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; font-size: 24px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">eydn</h1>
    </div>
  `;

  // Marketing emails get unsubscribe links; transactional emails get address only
  const MARKETING_EMAILS = ["memory_plan_offer", "download_reminder_9mo", "archive_notice"];
  const isMarketing = MARKETING_EMAILS.includes(emailType);

  const footer = isMarketing && data.unsubscribeToken
    ? emailFooterHtml(data.unsubscribeToken, "marketing")
    : `
    <div style="padding: 24px; text-align: center; color: #6B6B6B; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <p>eydn — Your AI Wedding Planning Guide</p>
      <p style="margin-top: 8px;"><a href="https://eydn.app/dashboard" style="color: #2C3E2D;">Go to Dashboard</a></p>
      <p style="margin-top: 8px;">Eydn App, 2921 Landmark Place, Suite 215, Madison, WI 53713</p>
    </div>
  `;

  const wrap = (body: string) => `
    <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      ${header}
      <div style="padding: 32px; color: #1A1A2E; font-size: 15px; line-height: 1.7;">
        ${body}
      </div>
      ${footer}
    </div>
  `;

  switch (emailType) {
    case "post_wedding_welcome":
      return {
        subject: `Congratulations, ${partnerNames}!`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Congratulations!</h2>
          <p>Your wedding day has arrived (or just passed) — we hope it was everything you dreamed of.</p>
          <p>Your eydn account will remain fully active for the next <strong>12 months</strong> so you can:</p>
          <ul style="padding-left: 20px;">
            <li>Download your complete guest list and vendor contacts</li>
            <li>Keep your wedding website live for guests to revisit photos</li>
            <li>Export all your planning data as a keepsake</li>
          </ul>
          <p>Enjoy married life! We're here if you need us.</p>
        `),
      };

    case "download_reminder_1mo":
      return {
        subject: `${partnerNames} — Your wedding data is safe with eydn`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">1 month post-wedding</h2>
          <p>Hi ${partnerNames.split(" &amp; ")[0]}! Just a friendly reminder that all your wedding planning data is still available in your eydn dashboard.</p>
          <p>Now is a great time to:</p>
          <ul style="padding-left: 20px;">
            <li><strong>Export your guest list</strong> — perfect for thank-you card addresses</li>
            <li><strong>Download your data</strong> — keep a personal backup of everything</li>
            <li><strong>Save vendor contacts</strong> — for future referrals or anniversary plans</li>
          </ul>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data</a>
          </p>
        `),
      };

    case "download_reminder_6mo":
      return {
        subject: `${partnerNames} — 6 months of married life!`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Happy half-anniversary!</h2>
          <p>6 months since ${dateFormatted} — time flies!</p>
          <p>Your eydn account is still fully active for another 6 months. After that, it will move to read-only mode.</p>
          <p>We recommend downloading a backup of your data while everything is fresh:</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data</a>
          </p>
        `),
      };

    case "download_reminder_9mo":
      return {
        subject: `${partnerNames} — 3 months until your account archives`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Heads up — archiving in 3 months</h2>
          <p>Your eydn account will move to <strong>read-only mode</strong> in about 3 months (12 months after your wedding on ${dateFormatted}).</p>
          <p>Before that happens, make sure to:</p>
          <ul style="padding-left: 20px;">
            <li>Download your complete wedding data</li>
            <li>Export your guest list (CSV/Excel/PDF)</li>
            <li>Save any photos from your wedding website gallery</li>
          </ul>
          <p>Want to keep full access? The <strong>Memory Plan ($29/year)</strong> keeps your wedding website live and your data fully accessible.</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Manage My Account</a>
          </p>
        `),
      };

    case "memory_plan_offer":
      return {
        subject: `${partnerNames} — Keep your wedding website alive`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Your wedding website doesn't have to go offline</h2>
          <p>Your eydn account is approaching its 12-month post-wedding mark. Soon, your dashboard will become read-only and your wedding website will eventually go offline.</p>
          <p>With the <strong>Memory Plan ($29/year)</strong>, you get:</p>
          <ul style="padding-left: 20px;">
            <li>Wedding website stays live — guests can always revisit it</li>
            <li>Full data access and export, forever</li>
            <li>Continue editing your guest list and photo gallery</li>
            <li>Priority support</li>
          </ul>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Subscribe to Memory Plan — $29/year</a>
          </p>
        `),
      };

    case "archive_notice":
      return {
        subject: `${partnerNames} — Your eydn account is now read-only`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Your account has been archived</h2>
          <p>It's been 12 months since your wedding on ${dateFormatted}. Your eydn account is now in <strong>read-only mode</strong>.</p>
          <p>You can still:</p>
          <ul style="padding-left: 20px;">
            <li>View all your wedding data</li>
            <li>Download a complete backup</li>
            <li>Export your guest list</li>
          </ul>
          <p>Your data will be preserved for another 12 months. After that, it will be permanently deleted.</p>
          <p>To restore full access and keep your wedding website live, subscribe to the Memory Plan:</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Subscribe — $29/year</a>
          </p>
        `),
      };

    case "sunset_warning_21mo":
      return {
        subject: `${partnerNames} — Your eydn data will be deleted in 3 months`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Important: Data deletion in 3 months</h2>
          <p>Your eydn account data from your wedding on ${dateFormatted} will be <strong>permanently deleted in approximately 3 months</strong> (24 months post-wedding).</p>
          <p><strong>Please download your data now</strong> if you haven't already:</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data Now</a>
          </p>
          <p style="margin-top: 16px;">Or subscribe to the Memory Plan ($29/year) to keep everything:</p>
          <p style="text-align: center;">
            <a href="https://eydn.app/dashboard/settings" style="color: #2C3E2D; font-weight: 600;">Subscribe to Memory Plan</a>
          </p>
        `),
      };

    case "sunset_final":
      return {
        subject: `${partnerNames} — Final notice: eydn data deletion`,
        html: wrap(`
          <h2 style="color: #1A1A2E; font-size: 22px;">Final notice</h2>
          <p>Your eydn account data will be <strong>permanently deleted within the next few days</strong>.</p>
          <p>This is your last chance to download your wedding planning data, guest list, vendor contacts, and photos.</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="https://eydn.app/dashboard/settings" style="display: inline-block; background: #A0204A; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data Immediately</a>
          </p>
          <p style="margin-top: 16px; color: #6B6B6B; font-size: 13px;">If you'd like to keep your data, subscribe to the Memory Plan ($29/year) before deletion occurs.</p>
        `),
      };

    default:
      return null;
  }
}
