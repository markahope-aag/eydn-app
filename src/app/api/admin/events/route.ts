import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";
import { untypedClient } from "@/lib/supabase/server";

type StatRow = {
  wedding_id: string;
  guests: number;
  tasks: number;
  completed_tasks: number;
  vendors: number;
  spent: number;
};

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data: weddings, error } = await supabase
    .from("weddings")
    .select("id, user_id, partner1_name, partner2_name, date, venue, budget, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const err = supabaseError(error, "admin/events");
  if (err) return err;

  // Per-wedding counts come from a single grouped-aggregate RPC instead of
  // five queries per wedding (the previous N+1).
  const { data: statsData } = await untypedClient(supabase).rpc("admin_wedding_event_stats");
  const stats = new Map<string, StatRow>(
    ((statsData as StatRow[] | null) ?? []).map((s) => [s.wedding_id, s])
  );

  const events = (weddings || []).map((w) => {
    const s = stats.get(w.id);
    return {
      id: w.id,
      user_id: w.user_id,
      name: `${w.partner1_name} & ${w.partner2_name}`,
      date: w.date,
      venue: w.venue,
      budget: w.budget,
      spent: Number(s?.spent ?? 0),
      guests: Number(s?.guests ?? 0),
      tasks: Number(s?.tasks ?? 0),
      completed_tasks: Number(s?.completed_tasks ?? 0),
      vendors: Number(s?.vendors ?? 0),
      created_at: w.created_at,
    };
  });

  return NextResponse.json(events);
}
