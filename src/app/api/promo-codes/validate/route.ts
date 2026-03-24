import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { SUBSCRIPTION_PRICE } from "@/lib/subscription";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const code = ((parsed.code as string) || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ valid: false, reason: "Please enter a promo code" });
  }

  const supabase = createSupabaseAdmin();

  // Look up the code (case-insensitive via stored uppercase)
  const { data: promo } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (!promo) {
    return NextResponse.json({ valid: false, reason: "Invalid promo code" });
  }

  // Check expiration
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "This promo code has expired" });
  }

  // Check usage limit
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return NextResponse.json({ valid: false, reason: "This promo code has reached its usage limit" });
  }

  // Check if user already redeemed this code
  const { data: existing } = await supabase
    .from("promo_code_redemptions")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ valid: false, reason: "You have already used this promo code" });
  }

  // Calculate discounted price
  const originalPrice = SUBSCRIPTION_PRICE;
  let discountAmount: number;

  if (promo.discount_type === "percentage") {
    discountAmount = Math.round(originalPrice * (promo.discount_value / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(promo.discount_value, originalPrice);
  }

  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return NextResponse.json({
    valid: true,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    original_price: originalPrice,
    discount_amount: discountAmount,
    final_price: finalPrice,
  });
}
