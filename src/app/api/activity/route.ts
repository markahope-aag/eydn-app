import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const err = supabaseError(error, "activity");
  if (err) return err;

  return NextResponse.json(data);
}
