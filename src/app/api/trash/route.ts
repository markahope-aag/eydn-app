import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type TrashItem = {
  type: string;
  id: string;
  name: string;
  deletedAt: string;
};

// Tables that support soft-delete, mapped to their display name key
const SOFT_DELETE_TABLES = [
  { table: "guests", type: "guest", nameField: "name" },
  { table: "vendors", type: "vendor", nameField: "name" },
  { table: "tasks", type: "task", nameField: "title" },
  { table: "expenses", type: "expense", nameField: "description" },
  { table: "wedding_party", type: "wedding_party", nameField: "name" },
  { table: "seating_tables", type: "seating_table", nameField: "name" },
  { table: "mood_board_items", type: "mood_board_item", nameField: "caption" },
] as const;

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const raw = supabase as unknown as SupabaseClient;
  const weddingId = wedding.id;

  const queries = SOFT_DELETE_TABLES.map(({ table, type, nameField }) =>
    raw
      .from(table)
      .select(`id, ${nameField}, deleted_at`)
      .eq("wedding_id", weddingId)
      .not("deleted_at", "is", null)
      .then(({ data }) =>
        (data ?? []).map((row: Record<string, unknown>) => ({
          type,
          id: row.id as string,
          name: (row[nameField] as string) || `Unnamed ${type}`,
          deletedAt: row.deleted_at as string,
        }))
      )
  );

  const results = await Promise.all(queries);
  const items: TrashItem[] = results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );

  return NextResponse.json(items);
}
