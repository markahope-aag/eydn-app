/**
 * Trial-expiry transactional email templates.
 * Brand voice: calm, direct, no exclamation points, acknowledge stress without amplifying it.
 */

export type TrialEmailType = "day_10_save_card" | "day_14_renews_today" | "day_14_downgraded";

type TrialEmailData = {
  partner1Name: string;
  trialEndsAt: string;
  cardLast4?: string;
  cardBrand?: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

function wrap(body: string): string {
  return `
    <div style="max-width: 560px; margin: 0 auto; background: #FAF6F1; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="background: linear-gradient(135deg, #2C3E2D, #D4A5A5); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
        <img src="${APP_URL}/logo-white.png" alt="Eydn" height="34" style="height: 34px; width: auto;" />
      </div>
      <div style="padding: 32px; color: #1A1A2E; font-size: 15px; line-height: 1.7;">
        ${body}
      </div>
      <div style="padding: 20px 32px 28px; color: #6B6B6B; font-size: 12px; text-align: center;">
        <p style="margin: 0;">Eydn App · 2921 Landmark Place, Suite 215, Madison, WI 53713</p>
        <p style="margin: 8px 0 0;"><a href="${APP_URL}/dashboard/billing" style="color: #2C3E2D;">Manage billing</a></p>
      </div>
    </div>
  `;
}

function button(label: string, href: string): string {
  return `
    <p style="text-align: center; margin: 28px 0 8px;">
      <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">${label}</a>
    </p>
  `;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function getTrialEmail(
  type: TrialEmailType,
  data: TrialEmailData
): { subject: string; html: string } {
  const firstName = data.partner1Name.split(" ")[0] || "there";
  const endsOn = formatDate(data.trialEndsAt);

  if (type === "day_10_save_card") {
    return {
      subject: "4 days left on your Eydn trial",
      html: wrap(`
        <h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0;">Hi ${firstName},</h2>
        <p>You&rsquo;re four days into the second half of your Eydn trial. On ${endsOn}, Pro features drop back to the free tier unless you&rsquo;ve picked a plan.</p>
        <p>The simplest thing is to save a card now. We won&rsquo;t charge anything today &mdash; the first $14.99 lands only when your trial ends, and you can cancel before then.</p>
        <p>If you&rsquo;d rather pay once and be done, Lifetime is $79.</p>
        ${button("Save a card", `${APP_URL}/dashboard/billing`)}
        <p style="color: #6B6B6B; font-size: 13px; text-align: center; margin-top: 20px;">
          Your wedding data stays put either way. Only the Pro features (Ask Eydn, PDF exports, attachments, templates) go away.
        </p>
        <p style="color: #6B6B6B; font-size: 12px; text-align: center; margin-top: 12px;">
          Wondering why we charge at all?
          <a href="${APP_URL}/why-we-charge-for-pro" style="color: #2C3E2D;">Here&rsquo;s the short answer</a>
          &middot;
          <a href="${APP_URL}/pledge" style="color: #2C3E2D;">The Eydn Pledge</a>
        </p>
      `),
    };
  }

  if (type === "day_14_renews_today") {
    const card = data.cardLast4
      ? `Your ${data.cardBrand || "card"} ending ${data.cardLast4}`
      : "Your card on file";
    return {
      subject: "Eydn Pro renews today",
      html: wrap(`
        <h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0;">Hi ${firstName},</h2>
        <p>${card} will be charged <strong>$14.99</strong> today for your first month of Eydn Pro. Nothing to do &mdash; Pro keeps running.</p>
        <p>If you&rsquo;ve changed your mind, you can cancel before the charge processes.</p>
        ${button("Manage billing", `${APP_URL}/dashboard/billing`)}
      `),
    };
  }

  // day_14_downgraded
  return {
    subject: "Your Eydn trial ended",
    html: wrap(`
      <h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0;">Hi ${firstName},</h2>
      <p>Your 14-day trial ended today. Your plans, tasks, guests, and everything you built are still there &mdash; that doesn&rsquo;t go anywhere.</p>
      <p>What changes: Ask Eydn, PDF exports, file attachments, and email templates stop working until you pick a plan.</p>
      <p>Two options:</p>
      <ul style="padding-left: 20px;">
        <li><strong>$14.99 / month.</strong> Cancel any time.</li>
        <li><strong>$79 once.</strong> Lifetime access, no renewals.</li>
      </ul>
      ${button("See plans", `${APP_URL}/dashboard/pricing`)}
      <p style="color: #6B6B6B; font-size: 13px; text-align: center; margin-top: 20px;">
        No pressure &mdash; your data is safe either way.
      </p>
      <p style="color: #6B6B6B; font-size: 12px; text-align: center; margin-top: 12px;">
        <a href="${APP_URL}/why-we-charge-for-pro" style="color: #2C3E2D;">Why we charge for Pro</a>
        &middot;
        <a href="${APP_URL}/what-free-costs" style="color: #2C3E2D;">What &ldquo;free&rdquo; really costs you</a>
        &middot;
        <a href="${APP_URL}/pledge" style="color: #2C3E2D;">The Pledge</a>
      </p>
    `),
  };
}
