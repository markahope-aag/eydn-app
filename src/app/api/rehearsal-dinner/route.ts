import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import type { Database } from "@/lib/supabase/types";

type RehearsalDinnerInsert = Database["public"]["Tables"]["rehearsal_dinner"]["Insert"];

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("rehearsal_dinner")
    .select()
    .eq("wedding_id", wedding.id)
    .single();

  if (data) {
    return NextResponse.json(data);
  }

  // Auto-create empty record
  const { data: created, error } = await supabase
    .from("rehearsal_dinner")
    .upsert({
      wedding_id: wedding.id,
      venue: null,
      date: null,
      time: null,
      address: null,
      notes: null,
      timeline: [],
      guest_list: [],
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(created);
}

export async function PUT(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const row: RehearsalDinnerInsert = {
    wedding_id: wedding.id,
    venue: (body.venue as string) ?? null,
    date: (body.date as string) ?? null,
    time: (body.time as string) ?? null,
    address: (body.address as string) ?? null,
    notes: (body.notes as string) ?? null,
    hosted_by: (body.hosted_by as string) ?? null,
    dress_code: (body.dress_code as string) ?? null,
    capacity: (body.capacity as number) ?? null,
    timeline: ((body.timeline as Record<string, unknown>[]) ?? []) as import("@/lib/supabase/types").Json,
    guest_list: (body.guest_list ?? []) as import("@/lib/supabase/types").Json,
  };

  const { data, error } = await supabase
    .from("rehearsal_dinner")
    .upsert(row, { onConflict: "wedding_id" })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
