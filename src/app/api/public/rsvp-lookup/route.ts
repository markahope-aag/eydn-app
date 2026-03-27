import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { logRequest } from "@/lib/api-logger";

export async function POST(request: Request) {
  const start = Date.now();
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`rsvp-lookup:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    logRequest("POST", "/api/public/rsvp-lookup", 429, Date.now() - start, { ip });
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const supabase = createSupabaseAdmin();
  const body = await request.json();
  const { name, wedding_slug } = body;

  if (!name || !wedding_slug) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof name !== "string" || name.length > 200) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  // Validate slug format — alphanumeric and hyphens only
  if (typeof wedding_slug !== "string" || !/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/.test(wedding_slug)) {
    return NextResponse.json({ error: "Invalid wedding slug" }, { status: 400 });
  }

  // Look up the wedding
  const { data: wedding } = await supabase
    .from("weddings")
    .select("id")
    .eq("website_slug", wedding_slug)
    .eq("website_enabled", true)
    .maybeSingle();

  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  // Search for the guest by name (case-insensitive)
  const { data: tokens } = await supabase
    .from("rsvp_tokens")
    .select("token, responded, guests(id, name)")
    .eq("wedding_id", wedding.id);

  const trimmed = name.trim().toLowerCase();
  const match = (tokens ?? []).find((t) => {
    const guest = t.guests as unknown as { id: string; name: string } | null;
    return guest?.name?.toLowerCase() === trimmed;
  });

  if (!match) {
    logRequest("POST", "/api/public/rsvp-lookup", 404, Date.now() - start, { ip });
    return NextResponse.json(
      { error: "We couldn't find that name on the guest list. Please check the spelling and try again." },
      { status: 404 },
    );
  }

  const guest = match.guests as unknown as { id: string; name: string };

  logRequest("POST", "/api/public/rsvp-lookup", 200, Date.now() - start, { ip });
  return NextResponse.json({
    token: match.token,
    guest_id: guest.id,
    guest_name: guest.name,
    responded: match.responded,
  });
}
