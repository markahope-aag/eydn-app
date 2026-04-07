import { getWeddingForUser } from "@/lib/auth";
import { untypedClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const weddingId = wedding.id;
  const raw = untypedClient(supabase);

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
    raw
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    raw
      .from("vendors")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    raw
      .from("tasks")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    raw
      .from("expenses")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    raw
      .from("wedding_party")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    raw
      .from("seating_tables")
      .select("*")
      .eq("wedding_id", weddingId)
      .is("deleted_at", null)
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
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("registry_links")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true }),
  ]);

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      weddingId,
      version: "1.0",
    },
    wedding,
    guests: guestsResult.data ?? [],
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
