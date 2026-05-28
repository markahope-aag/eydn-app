import { getWeddingForUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import QRCode from "qrcode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

/**
 * POST — Generate QR code(s) for personalised RSVP links.
 * Body: { guestId: string } for single, or { bulk: true } for all guests.
 *
 * QRs are generated locally with the `qrcode` library (no external service),
 * uploaded once to Supabase storage, and the resulting public URL is cached
 * on rsvp_tokens.qr_code_url so subsequent calls are no-ops. A printed QR
 * therefore stays valid forever — the link it encodes never changes and
 * never expires.
 */
export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const sb = supabase;

  const slug = wedding.website_slug;
  if (!slug) {
    return NextResponse.json({ error: "Set up your website URL first" }, { status: 400 });
  }

  if (body.bulk) {
    const { data: tokens } = await sb
      .from("rsvp_tokens")
      .select("id, token, guest_id, qr_code_url, guests(name)")
      .eq("wedding_id", wedding.id);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: "Generate RSVP links first" }, { status: 400 });
    }

    const results: { guestId: string; guestName: string; qrUrl: string }[] = [];

    for (const t of tokens) {
      if (t.qr_code_url) {
        results.push({
          guestId: t.guest_id,
          guestName: t.guests?.name || "Guest",
          qrUrl: t.qr_code_url,
        });
        continue;
      }

      const rsvpUrl = `${APP_URL}/w/${slug}?rsvp=${t.token}`;
      const qrUrl = await generateAndStoreQR(rsvpUrl, t.guests?.name || "Guest", wedding.id);

      if (qrUrl) {
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

  if (token.qr_code_url) {
    return NextResponse.json({ qrUrl: token.qr_code_url });
  }

  const rsvpUrl = `${APP_URL}/w/${slug}?rsvp=${token.token}`;
  const qrUrl = await generateAndStoreQR(rsvpUrl, token.guests?.name || "Guest", wedding.id);

  if (!qrUrl) {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }

  await sb
    .from("rsvp_tokens")
    .update({ qr_code_url: qrUrl })
    .eq("id", token.id);

  return NextResponse.json({ qrUrl });
}

async function generateAndStoreQR(
  url: string,
  label: string,
  weddingId: string
): Promise<string | null> {
  try {
    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 600,
      color: { dark: "#1A1A2E", light: "#FFFFFF" },
    });

    const safeName = label.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const storagePath = `${weddingId}/qr-${safeName}-${Date.now()}.png`;

    const admin = createSupabaseAdmin();
    const { error: uploadError } = await admin.storage
      .from("wedding-photos")
      .upload(storagePath, pngBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[QR] Storage upload failed:", uploadError.message);
      return null;
    }

    const { data: publicUrl } = admin.storage
      .from("wedding-photos")
      .getPublicUrl(storagePath);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error("[QR] Generation failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
