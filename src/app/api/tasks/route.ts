import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields } from "@/lib/validation";
import { notifyCollaborators } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const err = supabaseError(error, "tasks");
  if (err) return err;

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["title"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const allowed = pickFields(body, ["description", "due_date", "completed", "category"]);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      wedding_id: wedding.id,
      title: body.title as string,
      ...allowed,
    })
    .select()
    .single();

  const err = supabaseError(error, "tasks");
  if (err) return err;

  notifyCollaborators({ weddingId: wedding.id, actorUserId: userId, action: "create", entityType: "tasks", entityName: (data as Record<string, unknown>).title as string });

  return NextResponse.json(data, { status: 201 });
}
