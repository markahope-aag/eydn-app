import { getWeddingForUser } from "@/lib/auth";
import { restoreRecord, logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

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

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as { entityType?: string; entityId?: string };

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
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
