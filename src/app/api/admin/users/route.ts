import { requireAdmin } from "@/lib/admin";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // Get all users from Clerk
  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({ limit: 100 });

  // Get all weddings
  const { data: weddings } = await supabase
    .from("weddings")
    .select("id, user_id, partner1_name, partner2_name, date, budget, created_at");

  const weddingMap = new Map(
    (weddings || []).map((w: { id: string; user_id: string; partner1_name: string; partner2_name: string; date: string | null; budget: number | null; created_at: string }) => [w.user_id, w])
  );

  // Get roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role");

  const roleMap = new Map(
    (roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
  );

  // Build combined user list
  const users = await Promise.all(
    clerkUsers.data.map(async (u) => {
      const wedding = weddingMap.get(u.id) as { id: string; partner1_name: string; partner2_name: string; date: string | null; budget: number | null; created_at: string } | undefined;
      let guests = 0, tasks = 0, vendors = 0;

      if (wedding) {
        const [{ count: g }, { count: t }, { count: v }] = await Promise.all([
          supabase.from("guests").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
          supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
          supabase.from("vendors").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
        ]);
        guests = g ?? 0;
        tasks = t ?? 0;
        vendors = v ?? 0;
      }

      return {
        user_id: u.id,
        email: u.emailAddresses[0]?.emailAddress || "—",
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
        role: roleMap.get(u.id) || "user",
        has_wedding: !!wedding,
        wedding_name: wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : null,
        wedding_date: wedding?.date || null,
        guests,
        tasks,
        vendors,
        joined: u.createdAt,
      };
    })
  );

  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const body = await request.json();
  const { user_id, role } = body;

  if (!user_id || !role) {
    return NextResponse.json({ error: "user_id and role required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id, role });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
