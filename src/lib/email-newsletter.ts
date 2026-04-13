/**
 * Newsletter welcome email — delivers the promised wedding planning checklist
 * and sets expectations for the weekly cadence.
 */

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
        <p style="margin: 8px 0 0;">You&rsquo;re receiving this because you signed up at eydn.app. You can unsubscribe any time.</p>
      </div>
    </div>
  `;
}

function phase(title: string, items: string[]): string {
  return `
    <div style="margin: 20px 0; padding: 16px 20px; background: #fff; border-left: 3px solid #2C3E2D; border-radius: 6px;">
      <div style="font-weight: 600; color: #1A1A2E; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">${title}</div>
      <ul style="margin: 10px 0 0; padding-left: 20px; color: #2C3E2D;">
        ${items.map((i) => `<li style="margin: 4px 0;">${i}</li>`).join("")}
      </ul>
    </div>
  `;
}

export function getNewsletterWelcomeEmail(): { subject: string; html: string } {
  return {
    subject: "Your wedding planning checklist",
    html: wrap(`
      <h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0;">Welcome.</h2>
      <p>Here&rsquo;s the checklist we promised &mdash; the thing we&rsquo;d hand a friend who just got engaged. It&rsquo;s organized by when to tackle each piece, not by panic level.</p>

      ${phase("12+ months out", [
        "Set a budget range (who pays for what)",
        "Draft a rough guest count",
        "Pick a season and short-list venues",
        "Start a vendor wish list (photographer, florist, DJ/band)",
      ])}

      ${phase("9–11 months out", [
        "Book venue + ceremony location",
        "Book photographer and videographer",
        "Hire planner or coordinator if needed",
        "Send save-the-dates",
      ])}

      ${phase("6–8 months out", [
        "Book caterer, florist, DJ/band, and officiant",
        "Choose your wedding party",
        "Start the dress/suit process",
        "Plan honeymoon basics (passports, time off)",
      ])}

      ${phase("3–5 months out", [
        "Hair/makeup trial",
        "Order invitations and paper goods",
        "Menu tasting and finalize selections",
        "Book transport, rentals, and room blocks",
      ])}

      ${phase("1–2 months out", [
        "Finalize guest list and send invitations",
        "Wedding license (check your state&rsquo;s waiting period)",
        "Day-of timeline with all vendors",
        "Seating chart",
      ])}

      ${phase("Final week", [
        "Confirm vendor arrivals and contacts",
        "Day-of emergency kit",
        "Rehearsal dinner",
        "Rest",
      ])}

      <p style="margin-top: 28px;">We&rsquo;ll send one email a week with planning tips, honest vendor notes, and things other couples wish they&rsquo;d known earlier. Nothing else.</p>

      <p style="text-align: center; margin-top: 28px;">
        <a href="${APP_URL}/sign-up" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Try Eydn free</a>
      </p>

      <p style="text-align: center; font-size: 13px; color: #6B6B6B; margin-top: 8px;">
        The AI wedding planner that actually does things. 14 days free, no card required.
      </p>
    `),
  };
}
