import { getWeddingForUser, readOnlyError } from "@/lib/auth";
import { untypedClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

/**
 * Floor-plan objects — labelled boxes (dance floor, sweetheart table,
 * food table, etc.) placed on the seating chart canvas. floor_plan_objects
 * is a new table not yet in the generated DB types, so all access goes
 * through untypedClient. wedding_id scoping is enforced on every query.
 */
export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await untypedClient(supabase)
    .from("floor_plan_objects")
    .select()
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  const err = supabaseError(error, "floor-objects");
  if (err) return err;

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  if (result.role === "parent") return readOnlyError();
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as {
    label?: unknown;
    x?: unknown;
    y?: unknown;
    width?: unknown;
    height?: unknown;
  };

  const { data, error } = await untypedClient(supabase)
    .from("floor_plan_objects")
    .insert({
      wedding_id: wedding.id,
      label:
        typeof body.label === "string" && body.label.trim()
          ? body.label.trim()
          : "New area",
      x: typeof body.x === "number" ? body.x : 0,
      y: typeof body.y === "number" ? body.y : 0,
      width: typeof body.width === "number" ? body.width : 180,
      height: typeof body.height === "number" ? body.height : 110,
    })
    .select()
    .single();

  const err = supabaseError(error, "floor-objects");
  if (err) return err;

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  if (result.role === "parent") return readOnlyError();
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof body.label === "string") updates.label = body.label.trim() || "New area";
  if (typeof body.x === "number") updates.x = body.x;
  if (typeof body.y === "number") updates.y = body.y;
  if (typeof body.width === "number") updates.width = body.width;
  if (typeof body.height === "number") updates.height = body.height;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await untypedClient(supabase)
    .from("floor_plan_objects")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "floor-objects");
  if (err) return err;

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  if (result.role === "parent") return readOnlyError();
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await untypedClient(supabase)
    .from("floor_plan_objects")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "floor-objects");
  if (err) return err;

  return NextResponse.json({ success: true });
}
