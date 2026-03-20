import { getSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  const status = await getSubscriptionStatus();
  return NextResponse.json(status);
}
