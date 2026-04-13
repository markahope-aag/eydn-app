/**
 * Transactional email delivering a quiz result to the user immediately.
 * One shared template, parameterized by the quiz + result.
 */

import type { QuizResult } from "@/lib/quizzes/types";

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

export function getQuizResultEmail(
  quizTitle: string,
  result: QuizResult,
  firstName: string,
  score: number | null
): { subject: string; html: string } {
  const name = escapeHtml(firstName.split(" ")[0] || "there");
  const headline = escapeHtml(result.headline);
  const bodyParagraphs = result.body
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const eydnAngle = escapeHtml(result.eydnAngle);

  return {
    subject: `Your result: ${result.headline}`,
    html: wrap(`
      <p style="margin-top: 0; color: #6B6B6B; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em;">
        ${escapeHtml(quizTitle)}${score !== null ? ` · Score ${score}/24` : ""}
      </p>
      <h2 style="color: #1A1A2E; font-size: 26px; margin: 8px 0 20px;">Hi ${name} — you&rsquo;re ${headline}.</h2>
      ${bodyParagraphs}
      <div style="margin-top: 24px; padding: 20px; background: #fff; border-left: 3px solid #2C3E2D; border-radius: 6px;">
        <div style="font-weight: 600; color: #2C3E2D; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          How Eydn helps you
        </div>
        <p style="margin: 0;">${eydnAngle}</p>
      </div>
      <p style="text-align: center; margin-top: 28px;">
        <a href="${APP_URL}/sign-up" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #D4A5A5); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Try Eydn free</a>
      </p>
      <p style="text-align: center; font-size: 13px; color: #6B6B6B; margin-top: 8px;">
        The AI wedding planner that actually does things. 14 days free, no card required.
      </p>
    `),
  };
}
