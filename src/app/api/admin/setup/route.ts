import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * One-time setup: makes the current user an admin if no admins exist yet.
 * This is the bootstrap endpoint — call it once after first deploy.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Check if any admin already exists
  const { data: existingAdmins } = await supabase
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (existingAdmins && existingAdmins.length > 0) {
    return NextResponse.json(
      { error: "Admin already exists. Use the admin panel to manage roles." },
      { status: 403 }
    );
  }

  // Make current user admin
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "You are now an admin." });
}
