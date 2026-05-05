import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Admin diagnostic for the Unsplash integration. Reports whether
 * UNSPLASH_ACCESS_KEY is set in the runtime environment, and runs a tiny
 * test search so you can verify the key is actually accepted by Unsplash.
 *
 * GET /api/admin/unsplash-status
 *
 * Returns:
 *   { keyPresent: bool, keyMasked: string, search: { ok, status, sampleId } }
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const key = process.env.UNSPLASH_ACCESS_KEY || "";
  const keyPresent = Boolean(key);
  const keyMasked = keyPresent ? `${key.slice(0, 4)}…${key.slice(-4)}` : "(not set)";

  if (!keyPresent) {
    return NextResponse.json({
      keyPresent: false,
      keyMasked,
      search: { ok: false, status: null, error: "Cannot run test search without a key" },
    });
  }

  try {
    const u = new URL("https://api.unsplash.com/search/photos");
    u.searchParams.set("query", "wedding florals test");
    u.searchParams.set("per_page", "1");
    const res = await fetch(u, { headers: { Authorization: `Client-ID ${key}` } });
    const sample =
      res.ok ? ((await res.json()) as { results: Array<{ id: string }> }).results[0]?.id : null;

    return NextResponse.json({
      keyPresent: true,
      keyMasked,
      search: {
        ok: res.ok,
        status: res.status,
        sampleId: sample ?? null,
        rateLimitRemaining: res.headers.get("x-ratelimit-remaining"),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      keyPresent: true,
      keyMasked,
      search: { ok: false, status: null, error: msg },
    });
  }
}
