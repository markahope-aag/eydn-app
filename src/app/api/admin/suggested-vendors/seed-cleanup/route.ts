import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

/**
 * GET  — Preview seed vendors that would be deleted (dry run)
 * POST — Delete all seed vendors (example.com websites + 555 phone numbers)
 */

const SEED_INDICATORS = {
  website: "https://example.com",
  phonePrefix: "(555)",
};

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("suggested_vendors")
    .select("id, name, category, city, state, website, phone")
    .or(`website.eq.${SEED_INDICATORS.website},phone.like.${SEED_INDICATORS.phonePrefix}%`);

  const err = supabaseError(error, "admin/suggested-vendors/seed-cleanup");
  if (err) return err;

  return NextResponse.json({
    count: data?.length || 0,
    vendors: data || [],
    message: `Found ${data?.length || 0} seed vendors. POST to this endpoint to delete them permanently.`,
  });
}

export async function POST() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // First count what we're deleting
  const { data: preview } = await supabase
    .from("suggested_vendors")
    .select("id")
    .or(`website.eq.${SEED_INDICATORS.website},phone.like.${SEED_INDICATORS.phonePrefix}%`);

  const count = preview?.length || 0;
  if (count === 0) {
    return NextResponse.json({ deleted: 0, message: "No seed vendors found." });
  }

  const ids = preview!.map((v) => v.id);

  const { error } = await supabase
    .from("suggested_vendors")
    .delete()
    .in("id", ids);

  const err = supabaseError(error, "admin/suggested-vendors/seed-cleanup");
  if (err) return err;

  return NextResponse.json({
    deleted: count,
    message: `Permanently deleted ${count} seed vendors (example.com / 555 phone numbers).`,
  });
}
