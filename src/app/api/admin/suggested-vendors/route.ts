import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("suggested_vendors")
    .select()
    .order("category", { ascending: true })
    .order("name", { ascending: true });

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
  const { data, error } = await supabase
    .from("suggested_vendors")
    .insert({
      name: body.name as string,
      category: body.category as string,
      description: (body.description as string) || null,
      website: (body.website as string) || null,
      phone: (body.phone as string) || null,
      email: (body.email as string) || null,
      address: (body.address as string) || null,
      city: body.city as string,
      state: body.state as string,
      zip: (body.zip as string) || null,
      country: (body.country as string) || "US",
      price_range: (body.price_range as "$" | "$$" | "$$$" | "$$$$") || null,
      featured: (body.featured as boolean) || false,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
