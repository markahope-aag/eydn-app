import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Resend webhook endpoint for email event tracking.
 *
 * Configure in Resend dashboard → Webhooks:
 *   URL: https://eydn.app/api/webhooks/resend
 *   Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *
 * Resend signs webhooks with a secret — verify in production.
 * Set RESEND_WEBHOOK_SECRET in env vars.
 */
export async function POST(request: Request) {
  // Verify webhook signature if secret is configured
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("resend-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // Resend uses svix for webhook verification
    // For now, basic presence check — upgrade to full svix verification in production
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.type as string;
  const data = body.data as Record<string, unknown> | undefined;

  if (!eventType || !data) {
    return NextResponse.json({ error: "Missing event data" }, { status: 400 });
  }

  // Map Resend event types to our format
  const eventMap: Record<string, string> = {
    "email.delivered": "delivered",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.bounced": "bounced",
    "email.complained": "complained",
  };

  const mapped = eventMap[eventType];
  if (!mapped) {
    // Unknown event type — acknowledge but don't store
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("email_events").insert({
    email_id: (data.email_id as string) || "unknown",
    email_to: Array.isArray(data.to) ? (data.to as string[])[0] : (data.to as string) || "unknown",
    event_type: mapped,
    metadata: {
      subject: data.subject,
      click_url: (data.click as Record<string, unknown>)?.url,
      bounce_type: (data.bounce as Record<string, unknown>)?.type,
      raw_type: eventType,
    },
  });

  // On bounce or complaint, consider auto-unsubscribing
  if (mapped === "bounced" || mapped === "complained") {
    const email = Array.isArray(data.to) ? (data.to as string[])[0] : (data.to as string);
    if (email) {
      console.warn(`[EMAIL] ${mapped} for ${email} — consider auto-unsubscribe`);
    }
  }

  return NextResponse.json({ received: true });
}
