import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

/**
 * Server-side proxy for Unsplash's required `download_location` ping. Per the
 * Unsplash API guidelines, every time a photo is "used" (saved to the user's
 * mood board, embedded in a published asset, etc.) we must ping the
 * `download_location` URL returned with the photo. Skipping this is the most
 * common reason apps lose API access.
 *
 * Done server-side so the API key stays out of the browser.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ ok: false }, { status: 200 });

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const trackUrl = (parsed as { track_url?: string }).track_url;

  // Only allow Unsplash hosts — defense against being used as a generic
  // open-redirect/SSRF helper.
  if (
    !trackUrl ||
    typeof trackUrl !== "string" ||
    !/^https:\/\/api\.unsplash\.com\//.test(trackUrl)
  ) {
    return NextResponse.json({ error: "Invalid track URL" }, { status: 400 });
  }

  try {
    await fetch(trackUrl, {
      headers: { Authorization: `Client-ID ${key}` },
    });
  } catch {
    // Non-fatal — we don't want to block the user's save action just because
    // the ping failed.
  }

  return NextResponse.json({ ok: true });
}
