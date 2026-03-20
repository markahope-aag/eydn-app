import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/tasks/[id]/related">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from("related_tasks")
    .select("related_task_id")
    .eq("task_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/related">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;
  const body = await request.json();

  // Create bidirectional link
  const { error } = await supabase
    .from("related_tasks")
    .insert([
      { task_id: id, related_task_id: body.related_task_id },
      { task_id: body.related_task_id, related_task_id: id },
    ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/related">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const relatedId = url.searchParams.get("related_task_id");

  if (!relatedId) {
    return NextResponse.json({ error: "related_task_id required" }, { status: 400 });
  }

  // Remove bidirectional link
  await supabase.from("related_tasks").delete().eq("task_id", id).eq("related_task_id", relatedId);
  await supabase.from("related_tasks").delete().eq("task_id", relatedId).eq("related_task_id", id);

  return NextResponse.json({ success: true });
}
