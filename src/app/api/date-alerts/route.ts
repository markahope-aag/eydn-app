import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("date_change_alerts")
    .select()
    .eq("wedding_id", wedding.id)
    .eq("acknowledged", false)
    .order("created_at", { ascending: false });

  const err = supabaseError(error, "date-alerts");
  if (err) return err;

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  // Acknowledge an alert
  const alertId = body.alert_id as string;
  if (!alertId) {
    return NextResponse.json({ error: "alert_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("date_change_alerts")
    .update({ acknowledged: true })
    .eq("id", alertId)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "date-alerts");
  if (err) return err;

  return NextResponse.json({ success: true });
}
