import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("vendor_accounts")
    .select()
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Check if account already exists
  const { data: existing } = await supabase
    .from("vendor_accounts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Vendor account already exists" },
      { status: 409 }
    );
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["business_name", "category", "email", "city", "state"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendor_accounts")
    .insert({
      user_id: userId,
      business_name: body.business_name as string,
      category: body.category as string,
      email: body.email as string,
      city: body.city as string,
      state: body.state as string,
      description: (body.description as string) || null,
      website: (body.website as string) || null,
      phone: (body.phone as string) || null,
      price_range: (body.price_range as "$" | "$$" | "$$$" | "$$$$") || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Ensure user has a role record
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!existingRole) {
    await supabase.from("user_roles").insert({ user_id: userId, role: "user" });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  // Only allow updating own fields (not status or id)
  const allowedFields = [
    "business_name",
    "category",
    "email",
    "city",
    "state",
    "description",
    "website",
    "phone",
    "price_range",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendor_accounts")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
