import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  if (error) {
    console.error("[API]", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
