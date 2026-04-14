/**
 * Calculator confirmation email — Email 1 of the calculator nurture.
 * Delivers the couple's budget breakdown inline plus a direct sign-in link
 * into their pre-loaded Eydn account.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

type Allocation = { label: string; amount: number; pct: number };

function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

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
        <p style="margin: 8px 0 0;">You&rsquo;re receiving this because you used the Eydn budget calculator. You can unsubscribe any time.</p>
      </div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function breakdownTable(allocations: Allocation[]): string {
  const rows = allocations
    .map((a) => {
      const label = escapeHtml(a.label);
      const amount = formatUsd(a.amount);
      const pct = Math.round(a.pct * 100);
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(44,62,45,0.1); color: #2C3E2D;">${label}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(44,62,45,0.1); color: #6B6B6B; font-size: 13px;" align="right">${pct}%</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(44,62,45,0.1); color: #1A1A2E; font-weight: 600;" align="right">${amount}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
      <thead>
        <tr>
          <th align="left" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B6B6B;">Category</th>
          <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B6B6B;"></th>
          <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B6B6B;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

type CalculatorEmailParams = {
  firstName: string | null;
  budget: number;
  guests: number;
  state: string;
  allocations: Allocation[];
  signInUrl: string | null;
  isNewUser: boolean;
};

export function getCalculatorEmail({
  firstName,
  budget,
  guests,
  state,
  allocations,
  signInUrl,
  isNewUser,
}: CalculatorEmailParams): { subject: string; html: string } {
  const name = escapeHtml((firstName?.split(" ")[0] || "there").trim() || "there");
  const totalBudget = formatUsd(budget);
  const perGuest = formatUsd(Math.round(budget / guests));
  const stateLabel = escapeHtml(state);
  const guestCount = guests.toLocaleString("en-US");

  const ctaBlock = signInUrl
    ? `
      <div style="margin-top: 28px; padding: 20px; background: #fff; border-left: 3px solid #2C3E2D; border-radius: 6px;">
        <div style="font-weight: 600; color: #1A1A2E; font-size: 14px;">
          ${isNewUser ? "Your Eydn account is ready." : "Welcome back to your Eydn account."}
        </div>
        <p style="margin: 8px 0 0; color: #2C3E2D;">
          Your budget is already pre-loaded. Click below to sign in and pick up from here &mdash; no password needed, your 14-day trial starts the moment you land.
        </p>
        <p style="text-align: center; margin: 18px 0 0;">
          <a href="${signInUrl}" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Sign in to Eydn</a>
        </p>
        <p style="text-align: center; font-size: 11px; color: #6B6B6B; margin: 10px 0 0;">
          Link expires in 24 hours. If you miss it, reply to this email and we&rsquo;ll send another.
        </p>
      </div>
    `
    : `
      <p style="margin-top: 28px;">
        Ready to plan against this budget? Eydn tracks every dollar, flags overspend, and ties each line item to the vendor you&rsquo;re hiring.
      </p>
      <p style="text-align: center; margin-top: 18px;">
        <a href="${APP_URL}/sign-up" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Try Eydn free</a>
      </p>
    `;

  return {
    subject: `Your ${totalBudget} wedding budget breakdown`,
    html: wrap(`
      <h2 style="color: #1A1A2E; font-size: 22px; margin: 0 0 16px;">Hi ${name},</h2>
      <p>Here&rsquo;s the breakdown we ran for a <strong>${totalBudget}</strong> wedding with <strong>${guestCount}</strong> guests in <strong>${stateLabel}</strong>. Roughly <strong>${perGuest}</strong> per guest.</p>
      ${breakdownTable(allocations)}
      <p style="margin-top: 20px; color: #6B6B6B; font-size: 13px;">
        These percentages come from standard wedding industry benchmarks adjusted for your state and season. Think of them as a starting point &mdash; your real numbers will shift once you get actual quotes.
      </p>
      ${ctaBlock}
    `),
  };
}
