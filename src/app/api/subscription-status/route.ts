import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getToolCallMeter } from "@/lib/tool-call-counter";
import { NextResponse } from "next/server";

export async function GET() {
  const status = await getSubscriptionStatus();
  const { userId } = await auth();
  const toolCalls = userId
    ? await getToolCallMeter(userId, status.tier)
    : { used: 0, limit: null, remaining: null };
  return NextResponse.json({ ...status, toolCalls });
}
