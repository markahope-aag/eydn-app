import { getWeddingForUser } from "@/lib/auth";
import { logRequest } from "@/lib/api-logger";
import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("calendar_feed_tokens")
    .select("token")
    .eq("wedding_id", wedding.id)
    .is("revoked_at", null)
    .single();

  logRequest("GET", "/api/tasks/calendar-token", 200, Date.now() - start);
  return NextResponse.json({ token: data?.token || null });
}

export async function POST() {
  const start = Date.now();
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Revoke any existing active token
  await supabase
    .from("calendar_feed_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("wedding_id", wedding.id)
    .is("revoked_at", null);

  // Create new token
  const { data, error } = await supabase
    .from("calendar_feed_tokens")
    .insert({ wedding_id: wedding.id })
    .select("token")
    .single();

  if (error || !data) {
    logRequest("POST", "/api/tasks/calendar-token", 500, Date.now() - start);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  logRequest("POST", "/api/tasks/calendar-token", 200, Date.now() - start);
  return NextResponse.json({ token: data.token });
}
