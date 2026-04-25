import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { clerkClient } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";
import { emailWrap } from "@/lib/email-theme";
import { renderTemplate, loadTemplate, pickFooter } from "@/lib/email-sequences";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

/** Sample context used to render the template for the test send. */
const SAMPLE_CONTEXT = {
  firstName: "Sam",
  partnerNames: "Sam &amp; Alex",
  weddingDate: "June 15, 2026",
  endsOn: "Friday, May 1",
  cardDescription: "Your Visa ending 4242",
  appUrl: APP_URL,
  unsubscribeToken: "sample-token",
} as const;

/**
 * POST /api/admin/email/templates/[slug]/test-send
 * Body: { to?: string }  (defaults to admin's primary email)
 * Renders the template against SAMPLE_CONTEXT and sends a [TEST] copy.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { userId } = result;
  const { slug } = await ctx.params;

  // Body is optional for this endpoint — admin can omit `to` to send to themselves.
  const parsed = await safeParseJSON(req);
  const body = isParseError(parsed) ? {} : parsed;
  let to = typeof body.to === "string" && body.to.trim() ? body.to.trim() : null;

  if (!to) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      to =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
        null;
    } catch {
      return NextResponse.json({ error: "could not resolve admin email" }, { status: 400 });
    }
  }
  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });

  const template = await loadTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "template not found or disabled" }, { status: 404 });
  }

  const subject = `[TEST] ${renderTemplate(template.subject, SAMPLE_CONTEXT)}`;
  const body_ = renderTemplate(template.html, SAMPLE_CONTEXT);
  const footer = pickFooter(template.category, SAMPLE_CONTEXT.unsubscribeToken);
  const previewBanner =
    '<p style="margin:0 0 16px;padding:8px 12px;background:#FFF3CC;color:#8A5200;border-radius:8px;font-size:12px;text-align:center;">[TEST EMAIL — sample data, sent from the admin panel]</p>';
  const html = emailWrap(previewBanner + body_, footer);

  const sendResult = await sendEmail({ to, subject, html });
  return NextResponse.json({ success: sendResult.success, error: sendResult.error });
}
