import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, isValidNumber } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("notification_preferences")
    .select()
    .eq("wedding_id", wedding.id)
    .single();

  return NextResponse.json(data || { email_reminders: true, reminder_days_before: 7 });
}

export async function PUT(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  if (body.reminder_days_before !== undefined && !isValidNumber(body.reminder_days_before, 0, 365)) {
    return NextResponse.json({ error: "reminder_days_before must be a number between 0 and 365" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({
      wedding_id: wedding.id,
      email_reminders: body.email_reminders as boolean,
      reminder_days_before: body.reminder_days_before as number,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
