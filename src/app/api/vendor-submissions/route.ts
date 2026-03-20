import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const body = await request.json();

  const { error } = await supabase
    .from("vendor_submissions")
    .insert({
      submitted_by: userId,
      name: body.name,
      category: body.category,
      website: body.website || null,
      phone: body.phone || null,
      email: body.email || null,
      city: body.city || null,
      state: body.state || null,
      notes: body.notes || null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
