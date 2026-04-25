/**
 * Single source of truth for email visual tokens.
 *
 * Mirrors the canonical website palette in `src/app/globals.css`. If a design
 * token changes there it should change here — keep them in sync by hand (CSS
 * custom properties don't reach inlined email HTML).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

export const emailTheme = {
  appUrl: APP_URL,
  color: {
    bg: "#FAF6F1",          // --whisper
    surface: "#FFFFFF",
    text: "#1A1A2E",        // --deep-plum
    muted: "#5A5A5A",       // --muted-plum
    primary: "#2C3E2D",     // --violet (forest)
    accent: "#8B7A30",      // --soft-violet (gold)
    blush: "#D4A5A5",       // --blush-pink
    petal: "#E8D5B7",       // --petal / --border
    panel: "#EDE7DF",       // --lavender-mist
    error: "#A0204A",
  },
  font: {
    body: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
    serif: "'Cormorant Garamond', Georgia, serif",
  },
} as const;

const T = emailTheme;
const GRADIENT = `linear-gradient(135deg, ${T.color.primary}, ${T.color.accent})`;

/**
 * Wrap email body content in the standard Eydn shell (header gradient, padded
 * card, footer). Pass a pre-rendered footer HTML to override the default
 * transactional footer (e.g. with an unsubscribe link for marketing emails).
 */
export function emailWrap(body: string, footer?: string): string {
  return `
    <div style="max-width: 560px; margin: 0 auto; background: ${T.color.bg}; border-radius: 16px; overflow: hidden; font-family: ${T.font.body};">
      <div style="background: ${GRADIENT}; padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
        <img src="${T.appUrl}/logo-white.png" alt="Eydn" height="34" style="height: 34px; width: auto;" />
      </div>
      <div style="padding: 32px; color: ${T.color.text}; font-size: 15px; line-height: 1.7;">
        ${body}
      </div>
      ${footer ?? defaultFooter()}
    </div>
  `;
}

export function defaultFooter(): string {
  return `
    <div style="padding: 20px 32px 28px; color: ${T.color.muted}; font-size: 12px; text-align: center;">
      <p style="margin: 0;">Eydn App &middot; 2921 Landmark Place, Suite 215, Madison, WI 53713</p>
      <p style="margin: 8px 0 0;"><a href="${T.appUrl}/dashboard" style="color: ${T.color.primary};">Go to dashboard</a></p>
    </div>
  `;
}

export function emailButton(label: string, href: string): string {
  return `
    <p style="text-align: center; margin: 28px 0 8px;">
      <a href="${href}" style="display: inline-block; background: ${GRADIENT}; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">${label}</a>
    </p>
  `;
}

export function emailHeading(text: string): string {
  return `<h2 style="color: ${T.color.text}; font-size: 22px; margin-top: 0; font-family: ${T.font.serif}; font-weight: 600;">${text}</h2>`;
}
