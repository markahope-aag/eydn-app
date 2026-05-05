import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getToolCallMeter, incrementToolCallCount } from "@/lib/tool-call-counter";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { getClaudeClient } from "@/lib/ai/claude-client";
import { buildEdynSystemPrompt } from "@/lib/ai/edyn-system-prompt";
import { AI, PAGE_SIZE, CHAT_CONTEXT, TIME_WINDOWS } from "@/lib/config";
import { captureServer, estimateClaudeCostUsd } from "@/lib/analytics-server";
import type { Database } from "@/lib/supabase/types";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

// Narrow projection types for the context-building queries. Each one
// lists only the fields the chat system-prompt formatter reads, to
// keep the Claude context small. Kept at module scope (rather than
// inline inside the POST handler) so they're easy to spot and update
// alongside schema changes.
type TaskRow = {
  title: string;
  due_date: string | null;
  completed: boolean;
  category: string;
  notes: string | null;
};
type VendorRow = {
  name: string;
  category: string;
  status: string;
  poc_name: string | null;
  poc_email: string | null;
  poc_phone: string | null;
  amount: number | null;
  amount_paid: number | null;
  notes: string | null;
  arrival_time: string | null;
  meal_count: number;
};
type GuestRow = {
  name: string;
  rsvp_status: string;
  meal_preference: string | null;
  role: string | null;
  group_name: string | null;
  plus_one_name: string | null;
};
type PartyRow = {
  name: string;
  role: string;
  job_assignment: string | null;
  attire: string | null;
};
type ExpenseRow = {
  description: string;
  category: string;
  estimated: number;
  amount_paid: number;
  final_cost: number | null;
  paid: boolean;
};
type AttRow = {
  file_name: string;
  entity_type: string;
  entity_id: string;
  mime_type: string | null;
};
type TableRow = {
  table_number: number;
  name: string | null;
  shape: string;
  capacity: number;
};
type BlogRow = {
  title: string;
  slug: string;
  excerpt: string | null;
};
type MessageParam = { role: "user" | "assistant"; content: unknown };

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("chat_messages")
    .select()
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: true })
    .limit(PAGE_SIZE.CHAT_HISTORY);

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`chat:${ip}`, RATE_LIMITS.chat);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests. Please wait before sending another message." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const status = await getSubscriptionStatus();
  if (!status.features.chat) {
    return NextResponse.json(
      { error: "Premium feature — upgrade to continue", tier: status.tier, trialExpired: status.trialExpired },
      { status: 403 }
    );
  }

  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding: weddingData, supabase, userId } = result;

  // Free-tier monthly tool-call cap enforcement. Trial/Pro/Beta/Admin
  // tiers return { limit: null, remaining: null } and skip the counter.
  const meter = await getToolCallMeter(userId, status.tier);
  if (meter.remaining !== null && meter.remaining <= 0) {
    return NextResponse.json(
      {
        error: "You've used your free AI actions for this month. Upgrade to Pro for unlimited chat.",
        tier: status.tier,
        toolCallsUsed: meter.used,
        toolCallsLimit: meter.limit,
      },
      { status: 403 }
    );
  }
  let remainingToolCalls = meter.remaining; // null = unlimited

  const wedding = weddingData as Wedding;
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const userMessage = parsed.message as string | undefined;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  if (typeof userMessage !== "string" || userMessage.length > AI.MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message too long (max 10,000 characters)" }, { status: 400 });
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
    .limit(PAGE_SIZE.CHAT_HISTORY);

  // Get ALL wedding context for system prompt
  const [
    { count: taskTotal }, { count: taskCompleted },
    { data: expenses }, { data: guideData },
    { data: allTasks }, { data: allVendors },
    { data: allGuests }, { data: weddingParty },
    { data: expensesFull }, { data: dayOfPlan },
    { data: attachments }, { data: blogPosts },
    { data: seatingTables },
  ] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id).is("deleted_at", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id).eq("completed", true).is("deleted_at", null),
    supabase.from("expenses").select("amount_paid").eq("wedding_id", wedding.id).is("deleted_at", null),
    supabase.from("guide_responses").select("guide_slug, responses, completed").eq("wedding_id", wedding.id).eq("completed", true),
    supabase.from("tasks").select("title, due_date, completed, category, notes").eq("wedding_id", wedding.id).is("deleted_at", null).order("due_date", { ascending: true }).limit(50),
    supabase.from("vendors").select("name, category, status, poc_name, poc_email, poc_phone, amount, amount_paid, notes, arrival_time, meal_count").eq("wedding_id", wedding.id).is("deleted_at", null),
    supabase.from("guests").select("name, rsvp_status, meal_preference, role, group_name, plus_one_name").eq("wedding_id", wedding.id).is("deleted_at", null).order("name").limit(100),
    supabase.from("wedding_party").select("name, role, job_assignment, attire").eq("wedding_id", wedding.id).is("deleted_at", null).order("sort_order"),
    supabase.from("expenses").select("description, category, estimated, amount_paid, final_cost, paid").eq("wedding_id", wedding.id).is("deleted_at", null).order("category"),
    supabase.from("day_of_plans").select("content").eq("wedding_id", wedding.id).single(),
    supabase.from("attachments").select("file_name, entity_type, entity_id, mime_type, created_at").eq("wedding_id", wedding.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("blog_posts").select("title, slug, excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(10),
    supabase.from("seating_tables").select("table_number, name, shape, capacity").eq("wedding_id", wedding.id).is("deleted_at", null).order("table_number"),
  ]);

  const budgetSpent = (expenses || []).reduce((sum: number, e: { amount_paid: number }) => sum + (e.amount_paid || 0), 0);

  // Build guide summary
  let guidesSummary: string | undefined;
  if (guideData && guideData.length > 0) {
    const lines: string[] = [];
    for (const g of guideData as Array<{ guide_slug: string; responses: Record<string, unknown> }>) {
      const r = g.responses;
      const entries = Object.entries(r).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
      if (entries.length > 0) {
        const summary = entries.slice(0, CHAT_CONTEXT.GUIDE_RESPONSES).map(([, v]) => Array.isArray(v) ? v.join(", ") : String(v)).join(" | ");
        lines.push(`- ${g.guide_slug}: ${summary}`);
      }
    }
    if (lines.length > 0) guidesSummary = lines.join("\n");
  }

  // Build task summary with overdue highlighting
  let tasksSummary: string | undefined;
  if (allTasks && allTasks.length > 0) {
    const now = new Date();
    const twoWeeks = new Date(
      now.getTime() + TIME_WINDOWS.CHAT_CONTEXT_DAYS * 24 * 60 * 60 * 1000
    );
    const incomplete = (allTasks as TaskRow[]).filter((t) => !t.completed);
    const completed = (allTasks as TaskRow[]).filter((t) => t.completed);
    const overdue = incomplete.filter((t) => t.due_date && new Date(t.due_date) < now);
    const dueSoon = incomplete.filter((t) => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= twoWeeks);
    const lines: string[] = [];
    lines.push(`Completed: ${completed.length} of ${(allTasks as TaskRow[]).length}`);
    if (overdue.length > 0) {
      lines.push(`OVERDUE (${overdue.length}): ${overdue.slice(0, CHAT_CONTEXT.OVERDUE_TASKS_PREVIEW).map(t => t.title).join(", ")}${overdue.length > CHAT_CONTEXT.OVERDUE_TASKS_PREVIEW ? ` + ${overdue.length - CHAT_CONTEXT.OVERDUE_TASKS_PREVIEW} more` : ""}`);
    }
    if (dueSoon.length > 0) {
      lines.push(`Due in next 14 days (${dueSoon.length}): ${dueSoon.slice(0, CHAT_CONTEXT.DUE_SOON_TASKS_PREVIEW).map(t => `${t.title}${t.due_date ? ` (${t.due_date})` : ""}`).join(", ")}${dueSoon.length > CHAT_CONTEXT.DUE_SOON_TASKS_PREVIEW ? ` + ${dueSoon.length - CHAT_CONTEXT.DUE_SOON_TASKS_PREVIEW} more` : ""}`);
    }
    if (incomplete.length > 0) {
      lines.push("All upcoming:");
      for (const t of incomplete.slice(0, CHAT_CONTEXT.INCOMPLETE_TASKS_LIST)) {
        lines.push(`- ${t.title} (${t.category})${t.due_date ? ` — due ${t.due_date}` : ""}${t.notes ? ` [note: ${t.notes.slice(0, CHAT_CONTEXT.TEXT_TRUNCATE_LONG)}]` : ""}`);
      }
      if (incomplete.length > CHAT_CONTEXT.INCOMPLETE_TASKS_LIST) lines.push(`  ...and ${incomplete.length - CHAT_CONTEXT.INCOMPLETE_TASKS_LIST} more`);
    }
    tasksSummary = lines.join("\n");
  }

  // Build vendor summary with status grouping
  let vendorsSummary: string | undefined;
  if (allVendors && allVendors.length > 0) {
    const vendors = allVendors as VendorRow[];
    const booked = vendors.filter((v) => v.status === "booked" || v.status === "contracted");
    const inquired = vendors.filter((v) => v.status === "inquired" || v.status === "contacted");
    const needed = vendors.filter((v) => v.status === "needed" || v.status === "researching");
    const statusLines = [
      `Booked/contracted: ${booked.length}`,
      `In conversation: ${inquired.length}`,
      `Still needed: ${needed.length}`,
    ];
    const lines = [...statusLines, ""];
    for (const v of vendors) {
      let line = `- ${v.name} (${v.category}) — ${v.status}`;
      if (v.poc_name) line += `, contact: ${v.poc_name}`;
      if (v.poc_phone) line += ` ${v.poc_phone}`;
      if (v.poc_email) line += ` ${v.poc_email}`;
      if (v.amount) line += `, total: $${v.amount}`;
      if (v.amount_paid) line += `, paid: $${v.amount_paid}`;
      if (v.arrival_time) line += `, arrives: ${v.arrival_time}`;
      if (v.notes) line += ` [note: ${v.notes.slice(0, CHAT_CONTEXT.TEXT_TRUNCATE_SHORT)}]`;
      lines.push(line);
    }
    vendorsSummary = lines.join("\n");
  }

  // Build guest summary
  let guestsSummary: string | undefined;
  if (allGuests && allGuests.length > 0) {
    const guests = allGuests as GuestRow[];
    const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
    const declined = guests.filter((g) => g.rsvp_status === "declined").length;
    const pending = guests.filter((g) => !["accepted", "declined"].includes(g.rsvp_status)).length;
    const rsvpRate = guests.length > 0 ? Math.round(((accepted + declined) / guests.length) * 100) : 0;
    const lines = [`Total: ${guests.length} — Attending: ${accepted}, Declined: ${declined}, Awaiting RSVP: ${pending} (${rsvpRate}% response rate)`];
    // List guests with notable info
    for (const g of guests.slice(0, CHAT_CONTEXT.GUEST_LIST_PREVIEW)) {
      let line = `- ${g.name} (${g.rsvp_status})`;
      if (g.role) line += ` [${g.role}]`;
      if (g.group_name) line += ` group: ${g.group_name}`;
      if (g.meal_preference) line += ` meal: ${g.meal_preference}`;
      if (g.plus_one_name) line += ` +1: ${g.plus_one_name}`;
      lines.push(line);
    }
    if (guests.length > CHAT_CONTEXT.GUEST_LIST_PREVIEW) lines.push(`  ...and ${guests.length - CHAT_CONTEXT.GUEST_LIST_PREVIEW} more guests`);
    guestsSummary = lines.join("\n");
  }

  // Build wedding party summary
  let partySummary: string | undefined;
  if (weddingParty && weddingParty.length > 0) {
    partySummary = (weddingParty as PartyRow[]).map((p) => {
      let line = `- ${p.name} (${p.role})`;
      if (p.job_assignment) line += ` — job: ${p.job_assignment}`;
      if (p.attire) line += ` — attire: ${p.attire}`;
      return line;
    }).join("\n");
  }

  // Build budget summary
  let budgetSummary: string | undefined;
  if (expensesFull && expensesFull.length > 0) {
    const rows = expensesFull as ExpenseRow[];
    const totalEstimated = rows.reduce((s, e) => s + (e.estimated || 0), 0);
    const totalPaid = rows.reduce((s, e) => s + (e.amount_paid || 0), 0);
    const lines = [`Total estimated: $${totalEstimated.toLocaleString()}, paid: $${totalPaid.toLocaleString()}`];
    // Group by category
    const cats = new Map<string, { estimated: number; paid: number }>();
    for (const e of rows) {
      const c = cats.get(e.category) || { estimated: 0, paid: 0 };
      c.estimated += e.estimated || 0;
      c.paid += e.amount_paid || 0;
      cats.set(e.category, c);
    }
    for (const [cat, vals] of cats) {
      const variance = vals.estimated - vals.paid;
      const status = variance < 0 ? "OVER" : variance < vals.estimated * 0.1 ? "TIGHT" : "OK";
      lines.push(`- ${cat}: $${vals.estimated.toLocaleString()} allocated, $${vals.paid.toLocaleString()} spent [${status}]`);
    }
    budgetSummary = lines.join("\n");
  }

  // Build day-of plan summary
  let dayOfSummary: string | undefined;
  if (dayOfPlan) {
    const content = (dayOfPlan as { content: Record<string, unknown> }).content || {};
    const parts: string[] = [];
    const timeline = content.timeline as Array<{ time: string; event: string }> | undefined;
    if (timeline && timeline.length > 0) {
      parts.push("Timeline: " + timeline.map((t) => `${t.time} ${t.event}`).join(", "));
    }
    const speeches = content.speeches as Array<{ speaker: string; role: string }> | undefined;
    if (speeches && speeches.length > 0) {
      parts.push("Speeches: " + speeches.map((s) => `${s.speaker} (${s.role})`).join(", "));
    }
    const music = content.music as Array<{ moment: string; song: string }> | undefined;
    if (music && music.length > 0) {
      parts.push("Music: " + music.map((m) => `${m.moment}: ${m.song}`).join(", "));
    }
    if (parts.length > 0) dayOfSummary = parts.join("\n");
  }

  // Build attachments summary
  let attachmentsSummary: string | undefined;
  if (attachments && attachments.length > 0) {
    attachmentsSummary = (attachments as AttRow[]).map((a) =>
      `- ${a.file_name} (${a.entity_type}/${a.entity_id})${a.mime_type?.includes("pdf") ? " [PDF]" : ""}`
    ).join("\n");
  }

  // Build seating summary
  let seatingSummary: string | undefined;
  if (seatingTables && seatingTables.length > 0) {
    seatingSummary = (seatingTables as TableRow[]).map((t) =>
      `- ${t.name || `Table ${t.table_number}`} (${t.shape}, seats ${t.capacity})`
    ).join("\n");
  }

  // Build blog reference
  let blogReference: string | undefined;
  if (blogPosts && blogPosts.length > 0) {
    blogReference = (blogPosts as BlogRow[]).map((b) =>
      `- "${b.title}" — /blog/${b.slug}${b.excerpt ? `: ${b.excerpt.slice(0, CHAT_CONTEXT.BLOG_EXCERPT_LENGTH)}` : ""}`
    ).join("\n");
  }

  const systemPrompt = buildEdynSystemPrompt({
    wedding,
    taskStats: { total: taskTotal ?? 0, completed: taskCompleted ?? 0 },
    vendorCount: allVendors?.length ?? 0,
    guestCount: allGuests?.length ?? 0,
    budgetSpent,
    guidesSummary,
    tasksSummary,
    vendorsSummary,
    guestsSummary,
    partySummary,
    budgetSummary,
    dayOfSummary,
    attachmentsSummary,
    seatingSummary,
    blogReference,
  });

  // Build messages for Claude
  const messages = (history || [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Call Claude with tool use
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[chat] AI service API key not configured");
    return NextResponse.json({ error: "AI service temporarily unavailable" }, { status: 503 });
  }

  try {
    const claude = getClaudeClient();
    const { EYDN_TOOLS, executeTool } = await import("@/lib/ai/chat-tools");

    // Filter out tools the current tier isn't allowed to use. Free tier
    // loses `web_search` — Claude doesn't see it in the tool list, so it
    // won't try to call it in the first place.
    const availableTools = status.features.webSearch
      ? EYDN_TOOLS
      : EYDN_TOOLS.filter((t) => t.name !== "web_search");

    // Tool use loop — Claude may call tools, then we feed results back
    let currentMessages: MessageParam[] = [...messages];
    let finalText = "";
    const actionsTaken: string[] = [];
    let iterations = 0;
    let capHit = false;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalToolCalls = 0;

    while (iterations < AI.MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await claude.messages.create({
        model: AI.MODEL,
        max_tokens: AI.MAX_TOKENS,
        system: systemPrompt,
        messages: currentMessages as Parameters<typeof claude.messages.create>[0]["messages"],
        tools: availableTools,
      });

      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;

      // Collect text and tool use blocks
      let hasToolUse = false;

      for (const block of response.content) {
        if (block.type === "text") {
          finalText += block.text;
        } else if (block.type === "tool_use") {
          hasToolUse = true;

          // Free-tier cap: if no actions remain, refuse this tool call and
          // feed a synthetic result back so Claude can wrap up with text.
          if (remainingToolCalls !== null && remainingToolCalls <= 0) {
            capHit = true;
            const refusal = "You've used your free AI actions for this month. Upgrade to Pro for unlimited chat.";
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: response.content },
              {
                role: "user",
                content: [{ type: "tool_result", tool_use_id: block.id, content: refusal }],
              },
            ];
            continue;
          }

          totalToolCalls++;
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            supabase,
            wedding.id,
            userId
          );
          actionsTaken.push(result);

          // Count the tool call against the free-tier cap (no-op for others).
          if (status.tier === "free") {
            const newCount = await incrementToolCallCount(userId);
            remainingToolCalls = Math.max(0, (meter.limit ?? 0) - newCount);
          }

          // Add the assistant's response and tool result to continue the loop
          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: response.content },
            {
              role: "user",
              content: [{ type: "tool_result", tool_use_id: block.id, content: result }],
            },
          ];
        }
      }

      // If no tool was called, we're done
      if (!hasToolUse || response.stop_reason === "end_turn") {
        break;
      }
    }

    // Surface a nudge in the response if the cap was hit mid-loop.
    if (capHit && !finalText.toLowerCase().includes("upgrade")) {
      finalText += (finalText ? "\n\n" : "") +
        "You've used your free AI actions for this month. Upgrade to Pro for unlimited chat.";
    }

    // If actions were taken but no final text, add a summary
    if (actionsTaken.length > 0 && !finalText.trim()) {
      finalText = "Done — " + actionsTaken.join(" ");
    }

    // Save assistant response
    const savedContent = actionsTaken.length > 0
      ? `${finalText}\n\n_Actions taken: ${actionsTaken.join("; ")}_`
      : finalText;

    await supabase.from("chat_messages").insert({
      wedding_id: wedding.id,
      role: "assistant" as const,
      content: savedContent,
    });

    // Analytics — fire once per completed chat turn
    await captureServer(userId, "ai_chat_message_sent", {
      model: AI.MODEL,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      estimated_cost_usd: estimateClaudeCostUsd(totalInputTokens, totalOutputTokens),
      tool_calls_count: totalToolCalls,
      iterations,
      tier: status.tier,
    });

    // Return the response with action confirmations
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(finalText));
        if (actionsTaken.length > 0) {
          controller.enqueue(encoder.encode("\n\n---\n"));
          for (const action of actionsTaken) {
            controller.enqueue(encoder.encode(`✓ ${action}\n`));
          }
        }
        controller.close();
      },
    });

    // Final meter state reflects any increments from this request.
    const finalMeter = await getToolCallMeter(userId, status.tier);
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Tool-Calls-Used": String(finalMeter.used),
        "X-Tool-Calls-Limit": finalMeter.limit === null ? "-1" : String(finalMeter.limit),
        "X-Tool-Calls-Remaining": finalMeter.remaining === null ? "-1" : String(finalMeter.remaining),
      },
    });
  } catch (error) {
    console.error("[CHAT] Claude API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't reach Eydn. Try again." },
      { status: 500 }
    );
  }
}
