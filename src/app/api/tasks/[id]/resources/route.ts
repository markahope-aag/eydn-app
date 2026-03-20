import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();

  const { data, error } = await supabase
    .from("task_resources")
    .insert({
      task_id: id,
      label: body.label,
      url: body.url,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/resources">
) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
