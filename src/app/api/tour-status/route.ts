import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding } = result;

  return NextResponse.json({ tour_complete: wedding.tour_complete ?? false });
}

export async function PUT() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { error } = await supabase
    .from("weddings")
    .update({ tour_complete: true })
    .eq("id", wedding.id);

  const err = supabaseError(error, "tour-status");
  if (err) return err;

  return NextResponse.json({ success: true });
}
