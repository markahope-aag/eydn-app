import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { Webhook } from "svix";

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

/**
 * Resend webhook endpoint for email event tracking.
 *
 * Configure in Resend dashboard → Webhooks:
 *   URL: https://eydn.app/api/webhooks/resend
 *   Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *
 * Resend signs webhooks with a secret — verify with svix.
 * Set RESEND_WEBHOOK_SECRET in env vars.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;

  // Verify webhook signature if secret is configured
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const payload = await request.text();
    const wh = new Webhook(secret);
    try {
      wh.verify(payload, {
        "svix-id": request.headers.get("svix-id") || "",
        "svix-timestamp": request.headers.get("svix-timestamp") || "",
        "svix-signature": request.headers.get("svix-signature") || "",
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    body = JSON.parse(payload) as Record<string, unknown>;
  } else {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
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

  await supabase.from("email_events").insert({
    email_id: (data.email_id as string) || "unknown",
    email_to: Array.isArray(data.to) ? (data.to as string[])[0] : (data.to as string) || "unknown",
    event_type: mapped,
    metadata: {
      subject: (data.subject as string) || null,
      click_url: ((data.click as Record<string, unknown>)?.url as string) || null,
      bounce_type: ((data.bounce as Record<string, unknown>)?.type as string) || null,
      raw_type: eventType,
    },
  });

  // On bounce or complaint, consider auto-unsubscribing
  if (mapped === "bounced" || mapped === "complained") {
    const email = Array.isArray(data.to) ? (data.to as string[])[0] : (data.to as string);
    if (email) {
      console.warn(`[EMAIL] ${mapped} for ${redactEmail(email)} — consider auto-unsubscribe`);
    }
  }

  return NextResponse.json({ received: true });
}
