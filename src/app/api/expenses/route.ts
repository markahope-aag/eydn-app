import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: wedding } = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  // Fetch expenses + linked vendor names
  const { data: expensesData, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ExpenseRow = { vendor_id: string | null; [key: string]: unknown };
  const rows = (expensesData || []) as ExpenseRow[];

  // Get vendor names for linked expenses
  const vendorIds = [...new Set(rows.map((e) => e.vendor_id).filter(Boolean))];
  let vendorMap = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name")
      .in("id", vendorIds as string[]);
    type VendorRow = { id: string; name: string };
    vendorMap = new Map(((vendors || []) as VendorRow[]).map((v) => [v.id, v.name]));
  }

  const data = rows.map((e) => ({
    ...e,
    vendor_name: e.vendor_id ? vendorMap.get(e.vendor_id) || null : null,
  }));

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: wedding } = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      wedding_id: wedding.id,
      description: body.description,
      estimated: body.estimated ?? body.amount ?? 0,
      amount_paid: body.amount_paid ?? 0,
      final_cost: body.final_cost ?? null,
      category: body.category,
      paid: body.paid || false,
      vendor_id: body.vendor_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
