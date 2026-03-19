import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("questionnaire_responses")
    .select()
    .eq("wedding_id", wedding.id)
    .single();

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = await request.json();

  const { data, error } = await supabase
    .from("questionnaire_responses")
    .upsert({
      wedding_id: wedding.id,
      responses: body.responses,
      completed: body.completed ?? false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
