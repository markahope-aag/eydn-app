import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("vendor_accounts")
    .select(`
      *,
      vendor_placements (
        id,
        status,
        billing_period,
        started_at,
        ended_at,
        placement_tiers ( name, price_monthly )
      )
    `)
    .order("created_at", { ascending: false });

  const err = supabaseError(error, "admin/vendor-accounts");
  if (err) return err;

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const id = body.id as string | undefined;
  const status = body.status as string | undefined;
  const is_preferred = body.is_preferred as boolean | undefined;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (is_preferred !== undefined) updates.is_preferred = is_preferred;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendor_accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  const err = supabaseError(error, "admin/vendor-accounts");
  if (err) return err;

  return NextResponse.json(data);
}
