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

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
      amount: body.amount,
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
