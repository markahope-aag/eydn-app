import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("weddings")
    .insert({
      user_id: userId,
      partner1_name: body.partner1_name,
      partner2_name: body.partner2_name,
      date: body.date,
      venue: body.venue,
      budget: body.budget,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
