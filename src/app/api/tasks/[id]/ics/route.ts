import { getWeddingForUser } from "@/lib/auth";
import { logRequest } from "@/lib/api-logger";
import { generateSingleEventICS } from "@/lib/ics";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;
  const { id } = await params;

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, status, priority, category, edyn_message, notes")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .single();

  if (!task) {
    logRequest("GET", `/api/tasks/${id}/ics`, 404, Date.now() - start);
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!task.due_date) {
    logRequest("GET", `/api/tasks/${id}/ics`, 400, Date.now() - start);
    return NextResponse.json({ error: "Task has no due date" }, { status: 400 });
  }

  const ics = generateSingleEventICS(task);
  const slug = task.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  logRequest("GET", `/api/tasks/${id}/ics`, 200, Date.now() - start);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
