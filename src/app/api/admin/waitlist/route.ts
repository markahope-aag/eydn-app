import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  const err = supabaseError(error, "admin/waitlist");
  if (err) return err;

  return NextResponse.json(data);
}
