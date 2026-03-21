import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, isValidNumber } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Fetch expenses + linked vendor names
  const { data: expensesData, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
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
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["description", "category"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (body.estimated !== undefined && !isValidNumber(body.estimated, 0)) {
    return NextResponse.json({ error: "estimated must be a non-negative number" }, { status: 400 });
  }
  if (body.amount_paid !== undefined && !isValidNumber(body.amount_paid, 0)) {
    return NextResponse.json({ error: "amount_paid must be a non-negative number" }, { status: 400 });
  }
  if (body.final_cost !== undefined && body.final_cost !== null && !isValidNumber(body.final_cost, 0)) {
    return NextResponse.json({ error: "final_cost must be a non-negative number" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      wedding_id: wedding.id,
      description: body.description as string,
      estimated: (body.estimated ?? body.amount ?? 0) as number,
      amount_paid: (body.amount_paid ?? 0) as number,
      final_cost: (body.final_cost ?? null) as number | null,
      category: body.category as string,
      paid: (body.paid || false) as boolean,
      vendor_id: (body.vendor_id || null) as string | null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
