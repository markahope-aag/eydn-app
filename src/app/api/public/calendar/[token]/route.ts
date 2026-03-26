import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { logRequest } from "@/lib/api-logger";
import { generateICSFeed } from "@/lib/ics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const start = Date.now();
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`calendar:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    logRequest("GET", "/api/public/calendar/[token]", 429, Date.now() - start, { ip });
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { token } = await params;
  const supabase = createSupabaseAdmin();

  // Look up active token
  const { data: feedToken } = await supabase
    .from("calendar_feed_tokens")
    .select("wedding_id")
    .eq("token", token)
    .is("revoked_at", null)
    .single();

  if (!feedToken) {
    logRequest("GET", "/api/public/calendar/[token]", 404, Date.now() - start);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch wedding name for calendar title
  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner1_name, partner2_name")
    .eq("id", feedToken.wedding_id)
    .single();

  const calendarName = wedding
    ? `${wedding.partner1_name} & ${wedding.partner2_name} — Wedding Tasks`
    : "Wedding Tasks";

  // Fetch all non-deleted tasks with due dates
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, status, priority, category, edyn_message, notes")
    .eq("wedding_id", feedToken.wedding_id)
    .is("deleted_at", null)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const ics = generateICSFeed(tasks || [], calendarName);

  logRequest("GET", "/api/public/calendar/[token]", 200, Date.now() - start);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eydn-tasks.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
