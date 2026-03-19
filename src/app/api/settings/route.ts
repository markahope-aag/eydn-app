import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  const body = await request.json();

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({
      wedding_id: wedding.id,
      email_reminders: body.email_reminders,
      reminder_days_before: body.reminder_days_before,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
