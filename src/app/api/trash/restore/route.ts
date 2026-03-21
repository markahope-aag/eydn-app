import { getWeddingForUser } from "@/lib/auth";
import { restoreRecord, logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

const ENTITY_TYPE_TO_TABLE: Record<string, string> = {
  guest: "guests",
  vendor: "vendors",
  task: "tasks",
  expense: "expenses",
  wedding_party: "wedding_party",
  seating_table: "seating_tables",
  mood_board_item: "mood_board_items",
};

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  let body: { entityType?: string; entityId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { entityType, entityId } = body;

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  const table = ENTITY_TYPE_TO_TABLE[entityType];
  if (!table) {
    return NextResponse.json(
      {
        error: `entityType must be one of: ${Object.keys(ENTITY_TYPE_TO_TABLE).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const { error } = await restoreRecord(supabase, table, entityId, wedding.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity(supabase, {
    weddingId: wedding.id,
    userId,
    action: "restore",
    entityType,
    entityId,
  });

  return NextResponse.json({ success: true });
}
