import { requireAdmin } from "@/lib/admin";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({ limit: 100 });

  // Get roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role");

  const roleMap = new Map(
    (roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
  );

  // Check which users have weddings
  const { data: weddings } = await supabase
    .from("weddings")
    .select("user_id");

  const usersWithWeddings = new Set(
    (weddings || []).map((w: { user_id: string }) => w.user_id)
  );

  const users = clerkUsers.data.map((u) => ({
    user_id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
    email: u.emailAddresses[0]?.emailAddress || "—",
    role: roleMap.get(u.id) || "user",
    has_event: usersWithWeddings.has(u.id),
    joined: u.createdAt,
    last_sign_in: u.lastSignInAt,
  }));

  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const user_id = body.user_id as string | undefined;
  const role = body.role as "admin" | "user" | undefined;

  if (!user_id || !role) {
    return NextResponse.json({ error: "user_id and role required" }, { status: 400 });
  }

  const ALLOWED_ROLES = ["admin", "user"];
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "role must be one of: admin, user" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id, role });

  const err = supabaseError(error, "admin/users");
  if (err) return err;

  return NextResponse.json({ success: true });
}
