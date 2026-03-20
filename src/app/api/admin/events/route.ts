import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data: weddings, error } = await supabase
    .from("weddings")
    .select("id, user_id, partner1_name, partner2_name, date, venue, budget, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = await Promise.all(
    (weddings || []).map(async (w: { id: string; user_id: string; partner1_name: string; partner2_name: string; date: string | null; venue: string | null; budget: number | null; created_at: string }) => {
      const [{ count: guests }, { count: tasks }, { count: completedTasks }, { count: vendors }, { data: expenses }] =
        await Promise.all([
          supabase.from("guests").select("*", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", w.id).eq("completed", true),
          supabase.from("vendors").select("*", { count: "exact", head: true }).eq("wedding_id", w.id),
          supabase.from("expenses").select("amount").eq("wedding_id", w.id),
        ]);

      const totalSpent = (expenses || []).reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0);

      return {
        id: w.id,
        user_id: w.user_id,
        name: `${w.partner1_name} & ${w.partner2_name}`,
        date: w.date,
        venue: w.venue,
        budget: w.budget,
        spent: totalSpent,
        guests: guests ?? 0,
        tasks: tasks ?? 0,
        completed_tasks: completedTasks ?? 0,
        vendors: vendors ?? 0,
        created_at: w.created_at,
      };
    })
  );

  return NextResponse.json(events);
}
