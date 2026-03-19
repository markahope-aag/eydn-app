import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("vendors")
    .select()
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = await request.json();
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      wedding_id: wedding.id,
      category: body.category,
      name: body.name,
      status: body.status || "searching",
      poc_name: body.poc_name || null,
      poc_email: body.poc_email || null,
      poc_phone: body.poc_phone || null,
      notes: body.notes || null,
      amount: body.amount || null,
      amount_paid: body.amount_paid || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
