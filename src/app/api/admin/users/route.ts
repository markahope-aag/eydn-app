import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // Get all weddings with user info
  const { data: weddings, error } = await supabase
    .from("weddings")
    .select("id, user_id, partner1_name, partner2_name, date, budget, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role");

  const roleMap = new Map(
    (roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
  );

  // Get counts per wedding
  const users = await Promise.all(
    (weddings || []).map(async (w: { id: string; user_id: string; partner1_name: string; partner2_name: string; date: string | null; budget: number | null; created_at: string }) => {
      const [{ count: guestCount }, { count: taskCount }, { count: vendorCount }] =
        await Promise.all([
          supabase.from("guests").select("*", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("vendors").select("*", { count: "exact", head: true }).eq("wedding_id", w.id),
        ]);

      return {
        ...w,
        role: roleMap.get(w.user_id) || "user",
        guests: guestCount ?? 0,
        tasks: taskCount ?? 0,
        vendors: vendorCount ?? 0,
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
