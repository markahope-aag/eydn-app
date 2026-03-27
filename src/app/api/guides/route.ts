import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

/** List all guide responses for the current wedding. */
export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("guide_responses")
    .select("guide_slug, section_index, completed, updated_at")
    .eq("wedding_id", wedding.id)
    .order("updated_at", { ascending: false });

  const err = supabaseError(error, "guides");
  if (err) return err;

  return NextResponse.json(data);
}
