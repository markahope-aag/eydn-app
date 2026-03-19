import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const [
    { count: totalWeddings },
    { count: totalGuests },
    { count: totalTasks },
    { count: completedTasks },
    { count: totalVendors },
    { count: totalExpenses },
    { count: totalChatMessages },
  ] = await Promise.all([
    supabase.from("weddings").select("*", { count: "exact", head: true }),
    supabase.from("guests").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("completed", true),
    supabase.from("vendors").select("*", { count: "exact", head: true }),
    supabase.from("expenses").select("*", { count: "exact", head: true }),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    weddings: totalWeddings ?? 0,
    guests: totalGuests ?? 0,
    tasks: totalTasks ?? 0,
    completed_tasks: completedTasks ?? 0,
    vendors: totalVendors ?? 0,
    expenses: totalExpenses ?? 0,
    chat_messages: totalChatMessages ?? 0,
  });
}
