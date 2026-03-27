import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const BASE_URL = "https://places.googleapis.com/v1";

/**
 * Proxy for Google Places photo media.
 * Keeps the API key server-side instead of exposing it in client URLs.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");

  if (!ref || !ref.startsWith("places/")) {
    return NextResponse.json({ error: "Invalid photo reference" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "Google Places not configured" }, { status: 500 });
  }

  try {
    const photoRes = await fetch(
      `${BASE_URL}/${ref}/media?maxWidthPx=400`,
      {
        headers: { "X-Goog-Api-Key": API_KEY },
        redirect: "follow",
      }
    );

    if (!photoRes.ok) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const contentType = photoRes.headers.get("content-type") || "image/jpeg";
    const buffer = await photoRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 502 });
  }
}
