import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

/**
 * GET — Returns a single PNG QR code for the wedding's public website. Guests
 * who scan it land on the RSVP name-lookup screen and find themselves on the
 * guest list. One QR per wedding (vs the per-guest QR endpoint), so the same
 * image can be printed on every invitation, signage, or thank-you note.
 *
 * Generated locally — no external service, no caching needed, the URL it
 * encodes is the public website URL which never expires.
 */
export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding } = result;

  if (!wedding.website_slug) {
    return NextResponse.json(
      { error: "Set up your website URL first" },
      { status: 400 }
    );
  }

  const rsvpUrl = `${APP_URL}/w/${wedding.website_slug}`;

  const buffer = await QRCode.toBuffer(rsvpUrl, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 600,
    color: { dark: "#1A1A2E", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": 'inline; filename="wedding-rsvp-qr.png"',
    },
  });
}
