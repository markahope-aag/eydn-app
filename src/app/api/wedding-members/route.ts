import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getWeddingMembers } from "@/lib/wedding-members";

/**
 * People on the current user's wedding who can be @mentioned in comments.
 * Accessible to any wedding member (owner or collaborator).
 */
export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const members = await getWeddingMembers(wedding.user_id, wedding.id, supabase);
  return NextResponse.json(members);
}
