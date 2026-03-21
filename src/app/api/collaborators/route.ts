import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, role } = result;

  if (role !== "owner") {
    return NextResponse.json({ error: "Only the wedding owner can manage collaborators" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("wedding_collaborators")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId, role } = result;

  if (role !== "owner") {
    return NextResponse.json({ error: "Only the wedding owner can invite collaborators" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role: collabRole } = body;

  if (!email || !collabRole) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  }

  if (!["partner", "coordinator"].includes(collabRole)) {
    return NextResponse.json({ error: "Role must be partner or coordinator" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("wedding_collaborators")
    .insert({
      wedding_id: wedding.id,
      email: email.toLowerCase().trim(),
      role: collabRole,
      invited_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This person has already been invited" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
