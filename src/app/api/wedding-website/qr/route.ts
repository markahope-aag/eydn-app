import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

const UNIQODE_API_KEY = process.env.UNIQODE_API_KEY;
const UNIQODE_ORG_ID = process.env.UNIQODE_ORG_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

/**
 * POST — Generate QR code(s) for RSVP links via Uniqode API.
 * Body: { guestId: string } for single, or { bulk: true } for all guests.
 */
export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  if (!UNIQODE_API_KEY || !UNIQODE_ORG_ID) {
    return NextResponse.json({ error: "QR code service not configured" }, { status: 503 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Get the wedding slug for building URLs
  const slug = wedding.website_slug;
  if (!slug) {
    return NextResponse.json({ error: "Set up your website URL first" }, { status: 400 });
  }

  if (body.bulk) {
    // Bulk generate for all guests with tokens
    const { data: tokens } = await sb
      .from("rsvp_tokens")
      .select("id, token, guest_id, qr_code_url, guests(name)")
      .eq("wedding_id", wedding.id);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: "Generate RSVP links first" }, { status: 400 });
    }

    const results: { guestId: string; guestName: string; qrUrl: string }[] = [];

    for (const t of tokens) {
      // Skip if already generated
      if (t.qr_code_url) {
        results.push({
          guestId: t.guest_id,
          guestName: t.guests?.name || "Guest",
          qrUrl: t.qr_code_url,
        });
        continue;
      }

      const rsvpUrl = `${APP_URL}/w/${slug}?rsvp=${t.token}`;
      const qrUrl = await generateQR(rsvpUrl, t.guests?.name || "Guest");

      if (qrUrl) {
        // Cache the QR URL
        await sb
          .from("rsvp_tokens")
          .update({ qr_code_url: qrUrl })
          .eq("id", t.id);

        results.push({
          guestId: t.guest_id,
          guestName: t.guests?.name || "Guest",
          qrUrl,
        });
      }
    }

    return NextResponse.json({ generated: results.length, results });
  }

  // Single guest
  const guestId = body.guestId as string;
  if (!guestId) {
    return NextResponse.json({ error: "guestId required" }, { status: 400 });
  }

  const { data: token } = await sb
    .from("rsvp_tokens")
    .select("id, token, qr_code_url, guests(name)")
    .eq("wedding_id", wedding.id)
    .eq("guest_id", guestId)
    .single();

  if (!token) {
    return NextResponse.json({ error: "No RSVP token for this guest" }, { status: 404 });
  }

  // Return cached if available
  if (token.qr_code_url) {
    return NextResponse.json({ qrUrl: token.qr_code_url });
  }

  const rsvpUrl = `${APP_URL}/w/${slug}?rsvp=${token.token}`;
  const qrUrl = await generateQR(rsvpUrl, token.guests?.name || "Guest");

  if (!qrUrl) {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }

  // Cache
  await sb
    .from("rsvp_tokens")
    .update({ qr_code_url: qrUrl })
    .eq("id", token.id);

  return NextResponse.json({ qrUrl });
}

async function generateQR(url: string, label: string): Promise<string | null> {
  try {
    // Step 1: Create the QR code
    const createRes = await fetch("https://api.uniqode.com/api/2.0/qrcodes/", {
      method: "POST",
      headers: {
        Authorization: `Token ${UNIQODE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organization: Number(UNIQODE_ORG_ID),
        qr_type: 2,
        campaign: {
          content_type: 1,
          custom_url: url,
        },
        name: `RSVP: ${label}`,
      }),
    });

    if (!createRes.ok) {
      console.error("[QR] Uniqode create error:", createRes.status, await createRes.text().catch(() => ""));
      return null;
    }

    const createData = await createRes.json();
    const qrId = createData.id;
    if (!qrId) {
      console.error("[QR] No ID returned from Uniqode");
      return null;
    }

    // Step 2: Get the download URL
    const downloadRes = await fetch(`https://api.uniqode.com/api/2.0/qrcodes/${qrId}/download/`, {
      headers: {
        Authorization: `Token ${UNIQODE_API_KEY}`,
      },
    });

    if (!downloadRes.ok) {
      console.error("[QR] Uniqode download error:", downloadRes.status);
      return null;
    }

    const downloadData = await downloadRes.json();
    return downloadData.urls?.png || null;
  } catch (error) {
    console.error("[QR] Generation failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
