import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getToolCallMeter } from "@/lib/tool-call-counter";
import { resolveWeddingForUserId } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const status = await getSubscriptionStatus();
  const { userId } = await auth();
  const toolCalls = userId
    ? await getToolCallMeter(userId, status.tier)
    : { used: 0, limit: null, remaining: null };

  // Collaborator role on the resolved wedding — drives read-only UI for the
  // "parent" role. null when the user owns no wedding / collaborates on none yet.
  let role: "owner" | "partner" | "coordinator" | "parent" | null = null;
  if (userId) {
    const resolved = await resolveWeddingForUserId(createSupabaseAdmin(), userId);
    role = resolved?.role ?? null;
  }

  return NextResponse.json({ ...status, toolCalls, role });
}
