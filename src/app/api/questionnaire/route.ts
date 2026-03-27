import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

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

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["responses"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("questionnaire_responses")
    .upsert({
      wedding_id: wedding.id,
      responses: body.responses as import("@/lib/supabase/types").Json,
      completed: (body.completed as boolean) ?? false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  const err = supabaseError(error, "questionnaire");
  if (err) return err;

  return NextResponse.json(data);
}
