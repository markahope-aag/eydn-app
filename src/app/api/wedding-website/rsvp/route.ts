import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("rsvp_tokens")
    .select("*, guests(name, email, rsvp_status, meal_preference, plus_one_name)")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Get all guests
  const { data: guests, error: guestsError } = await supabase
    .from("guests")
    .select("id")
    .eq("wedding_id", wedding.id);

  if (guestsError) {
    return NextResponse.json({ error: guestsError.message }, { status: 500 });
  }

  // Get existing tokens
  const { data: existingTokens } = await supabase
    .from("rsvp_tokens")
    .select("guest_id")
    .eq("wedding_id", wedding.id);

  const existingGuestIds = new Set(existingTokens?.map((t) => t.guest_id) ?? []);

  // Create tokens for guests that don't have one
  const newTokens = (guests ?? [])
    .filter((g) => !existingGuestIds.has(g.id))
    .map((g) => ({
      guest_id: g.id,
      wedding_id: wedding.id,
      token: randomUUID().replace(/-/g, "").slice(0, 12),
    }));

  if (newTokens.length === 0) {
    return NextResponse.json({ message: "All guests already have RSVP tokens", created: 0 });
  }

  const { error } = await supabase.from("rsvp_tokens").insert(newTokens);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Created ${newTokens.length} RSVP tokens`, created: newTokens.length });
}
