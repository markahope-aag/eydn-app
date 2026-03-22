import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["name", "category"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("vendor_submissions")
    .insert({
      submitted_by: userId,
      name: body.name as string,
      category: body.category as string,
      website: (body.website as string) || null,
      phone: (body.phone as string) || null,
      email: (body.email as string) || null,
      city: (body.city as string) || null,
      state: (body.state as string) || null,
      notes: (body.notes as string) || null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
