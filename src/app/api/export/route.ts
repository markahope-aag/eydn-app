import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const weddingId = wedding.id;
  const raw = supabase as unknown as SupabaseClient;

  // Run all queries in parallel
  const [
    guestsResult,
    vendorsResult,
    tasksResult,
    expensesResult,
    weddingPartyResult,
    seatingTablesResult,
    seatAssignmentsResult,
    ceremonyPositionsResult,
    chatMessagesResult,
    questionnaireResult,
    dayOfPlanResult,
    moodBoardResult,
    registryLinksResult,
  ] = await Promise.all([
    // Guests: include soft-deleted with a flag
    raw
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("vendors")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("expenses")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("wedding_party")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("seating_tables")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("table_number", { ascending: true }),
    raw
      .from("seat_assignments")
      .select("*, seating_tables!inner(wedding_id)")
      .eq("seating_tables.wedding_id", weddingId),
    supabase
      .from("ceremony_positions")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("position_order", { ascending: true }),
    supabase
      .from("chat_messages")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("questionnaire_responses")
      .select("*")
      .eq("wedding_id", weddingId)
      .single(),
    supabase
      .from("day_of_plans")
      .select("*")
      .eq("wedding_id", weddingId)
      .single(),
    raw
      .from("mood_board_items")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("registry_links")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true }),
  ]);

  // Mark deleted guests with a `deleted` flag
  const guests = (guestsResult.data ?? []).map(
    (g: Record<string, unknown>) => ({
      ...g,
      deleted: g.deleted_at != null,
    })
  );

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      weddingId,
      version: "1.0",
    },
    wedding,
    guests,
    vendors: vendorsResult.data ?? [],
    tasks: tasksResult.data ?? [],
    expenses: expensesResult.data ?? [],
    weddingParty: weddingPartyResult.data ?? [],
    seatingTables: seatingTablesResult.data ?? [],
    seatAssignments: seatAssignmentsResult.data ?? [],
    ceremonyPositions: ceremonyPositionsResult.data ?? [],
    chatMessages: chatMessagesResult.data ?? [],
    questionnaireResponses: questionnaireResult.data ?? {},
    dayOfPlan: dayOfPlanResult.data ?? {},
    moodBoard: moodBoardResult.data ?? [],
    registryLinks: registryLinksResult.data ?? [],
  };

  return NextResponse.json(exportData);
}
