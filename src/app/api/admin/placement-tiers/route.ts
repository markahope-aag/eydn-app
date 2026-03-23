import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("placement_tiers")
    .select()
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const priceMonthly = body.price_monthly as number;

  const { data, error } = await supabase
    .from("placement_tiers")
    .insert({
      name: body.name as string,
      description: (body.description as string) || null,
      price_monthly: priceMonthly,
      price_quarterly: (body.price_quarterly as number) ?? Math.round(priceMonthly * 3 * 0.9),
      price_annual: (body.price_annual as number) ?? Math.round(priceMonthly * 12 * 0.8),
      features: (body.features as string[]) || [],
      sort_order: (body.sort_order as number) ?? 0,
      active: body.active !== false,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
  const { id, ...updates } = body as Record<string, unknown> & { id?: string };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const allowedFields = [
    "name",
    "description",
    "price_monthly",
    "price_quarterly",
    "price_annual",
    "features",
    "sort_order",
    "active",
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filtered[key] = updates[key];
    }
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("placement_tiers")
    .update(filtered)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
