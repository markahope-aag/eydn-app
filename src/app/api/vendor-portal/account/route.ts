import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  const body = await request.json();

  const { data, error } = await supabase
    .from("vendor_accounts")
    .insert({
      user_id: userId,
      business_name: body.business_name,
      category: body.category,
      email: body.email,
      city: body.city || null,
      state: body.state || null,
      description: body.description || null,
      website: body.website || null,
      phone: body.phone || null,
      price_range: body.price_range || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
