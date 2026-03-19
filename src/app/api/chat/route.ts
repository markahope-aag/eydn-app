import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getClaudeClient } from "@/lib/ai/claude-client";
import { buildEdynSystemPrompt } from "@/lib/ai/edyn-system-prompt";
import type { Database } from "@/lib/supabase/types";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("chat_messages")
    .select()
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding: weddingData, supabase } = result;

  const wedding = weddingData as Wedding;
  const body = await request.json();
  const userMessage = body.message;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Save user message
  await supabase.from("chat_messages").insert({
    wedding_id: wedding.id,
    role: "user" as const,
    content: userMessage,
  });

  // Get recent history
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get wedding context for system prompt
  const [{ count: taskTotal }, { count: taskCompleted }, { count: vendorCount }, { count: guestCount }, { data: expenses }] =
    await Promise.all([
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id).eq("completed", true),
      supabase.from("vendors").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
      supabase.from("guests").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
      supabase.from("expenses").select("amount").eq("wedding_id", wedding.id),
    ]);

  const budgetSpent = (expenses || []).reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0);

  const systemPrompt = buildEdynSystemPrompt({
    wedding,
    taskStats: { total: taskTotal ?? 0, completed: taskCompleted ?? 0 },
    vendorCount: vendorCount ?? 0,
    guestCount: guestCount ?? 0,
    budgetSpent,
  });

  // Build messages for Claude
  const messages = (history || [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Stream response
  const claude = getClaudeClient();

  const stream = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
    stream: true,
  });

  // Collect full response while streaming
  let fullResponse = "";

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullResponse += event.delta.text;
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }

      // Save assistant response
      await supabase.from("chat_messages").insert({
        wedding_id: wedding.id,
        role: "assistant" as const,
        content: fullResponse,
      });

      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
