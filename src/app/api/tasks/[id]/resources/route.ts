import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/tasks/[id]/resources">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from("task_resources")
    .select()
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/resources">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const { data, error } = await supabase
    .from("task_resources")
    .insert({
      task_id: id,
      label: body.label as string,
      url: body.url as string,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(request: Request, _ctx: RouteContext<"/api/tasks/[id]/resources">) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const url = new URL(request.url);
  const resourceId = url.searchParams.get("resource_id");

  if (!resourceId) {
    return NextResponse.json({ error: "resource_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("task_resources")
    .delete()
    .eq("id", resourceId);

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
