import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Explicit columns — the activity_log feed is decorative on the
  // dashboard, so don't ship every future column added to the table.
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, entity_type, entity_name, user_id, created_at")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const err = supabaseError(error, "activity");
  if (err) return err;

  return NextResponse.json(data);
}
