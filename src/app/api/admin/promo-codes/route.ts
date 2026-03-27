import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";
import { apiError, supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  const err = supabaseError(error, "admin/promo-codes");
  if (err) return err;

  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase, userId } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["code", "discount_type", "discount_value"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const code = (body.code as string).trim().toUpperCase();
  const discountType = body.discount_type as "percentage" | "fixed";
  const discountValue = body.discount_value as number;

  if (!["percentage", "fixed"].includes(discountType)) {
    return NextResponse.json({ error: "discount_type must be 'percentage' or 'fixed'" }, { status: 400 });
  }

  if (discountValue <= 0) {
    return NextResponse.json({ error: "discount_value must be positive" }, { status: 400 });
  }

  if (discountType === "percentage" && discountValue > 100) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
  }

  if (code.length < 3 || code.length > 30) {
    return NextResponse.json({ error: "Code must be 3-30 characters" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code,
      description: (body.description as string) || null,
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: (body.max_uses as number) || null,
      expires_at: (body.expires_at as string) || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return NextResponse.json({ error: "This promo code already exists" }, { status: 409 });
    }
    return apiError(error.message, 500, "admin/promo-codes");
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const id = body.id as string;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.max_uses !== undefined) updates.max_uses = body.max_uses;
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
  if (body.description !== undefined) updates.description = body.description;

  const { error } = await supabase
    .from("promo_codes")
    .update(updates)
    .eq("id", id);

  const err = supabaseError(error, "admin/promo-codes");
  if (err) return err;

  return NextResponse.json({ success: true });
}
