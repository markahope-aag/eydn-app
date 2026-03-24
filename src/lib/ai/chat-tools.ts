import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Tools that Eydn can use to take actions in the app.
 * Each tool maps to a real API operation on the user's wedding data.
 */

// ─── Search rate limiting (10 searches/user/day) ────────────────────────────
const searchCounts = new Map<string, { count: number; resetAt: number }>();
const SEARCH_DAILY_LIMIT = 10;

function canSearch(userId: string): boolean {
  const now = Date.now();
  const entry = searchCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    searchCounts.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= SEARCH_DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Search result cache (24h) ──────────────────────────────────────────────
const searchCache = new Map<string, { results: string; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const EYDN_TOOLS: Tool[] = [
  {
    name: "add_guest",
    description: "Add a new guest to the wedding guest list",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Guest's full name" },
        email: { type: "string", description: "Guest's email (optional)" },
        role: { type: "string", enum: ["family", "friend", "wedding_party", "coworker", "plus_one", "other"], description: "Guest's relationship" },
        group_name: { type: "string", description: "Group name (e.g., 'Bride's Family')" },
        meal_preference: { type: "string", description: "Meal preference (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_guest_rsvp",
    description: "Update a guest's RSVP status",
    input_schema: {
      type: "object" as const,
      properties: {
        guest_name: { type: "string", description: "Name of the guest to update" },
        rsvp_status: { type: "string", enum: ["not_invited", "invite_sent", "pending", "accepted", "declined"], description: "New RSVP status" },
      },
      required: ["guest_name", "rsvp_status"],
    },
  },
  {
    name: "add_task",
    description: "Add a new task to the wedding planning timeline",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        category: { type: "string", description: "Category (e.g., Planning, Flowers, Music)" },
        due_date: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
        notes: { type: "string", description: "Additional notes (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed",
    input_schema: {
      type: "object" as const,
      properties: {
        task_title: { type: "string", description: "Title of the task to mark complete" },
      },
      required: ["task_title"],
    },
  },
  {
    name: "add_vendor",
    description: "Add a new vendor to the vendor list",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Vendor business name" },
        category: { type: "string", description: "Vendor category (e.g., Photographer, Florist, DJ)" },
        poc_name: { type: "string", description: "Point of contact name (optional)" },
        poc_email: { type: "string", description: "Contact email (optional)" },
        poc_phone: { type: "string", description: "Contact phone (optional)" },
        amount: { type: "number", description: "Total cost/quote (optional)" },
        notes: { type: "string", description: "Notes (optional)" },
      },
      required: ["name", "category"],
    },
  },
  {
    name: "update_vendor_status",
    description: "Update a vendor's booking status",
    input_schema: {
      type: "object" as const,
      properties: {
        vendor_name: { type: "string", description: "Name of the vendor to update" },
        status: { type: "string", enum: ["searching", "contacted", "quote_received", "booked", "deposit_paid", "paid_in_full"], description: "New status" },
      },
      required: ["vendor_name", "status"],
    },
  },
  {
    name: "add_expense",
    description: "Add a new budget line item / expense",
    input_schema: {
      type: "object" as const,
      properties: {
        description: { type: "string", description: "Expense description" },
        category: { type: "string", description: "Budget category" },
        estimated: { type: "number", description: "Estimated cost" },
        amount_paid: { type: "number", description: "Amount already paid (optional)" },
      },
      required: ["description", "category"],
    },
  },
  {
    name: "add_to_mood_board",
    description: "Save a note or idea to the vision/mood board",
    input_schema: {
      type: "object" as const,
      properties: {
        caption: { type: "string", description: "Description of the inspiration idea" },
        category: { type: "string", enum: ["General", "Ceremony", "Reception", "Florals", "Table Settings", "Lighting", "Attire", "Hair & Makeup", "Cake & Desserts", "Stationery", "Colors & Palette", "Photo Inspo", "Favors", "Other"], description: "Category" },
      },
      required: ["caption", "category"],
    },
  },
  {
    name: "update_key_decisions",
    description: "Add important information to the 'Things Eydn should know' section so it's remembered in future conversations",
    input_schema: {
      type: "object" as const,
      properties: {
        info: { type: "string", description: "The key decision, preference, or important info to remember" },
      },
      required: ["info"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for wedding-related information — vendors, venues, pricing, inspiration, planning tips. Use this when the user asks you to find, look up, or research something that requires current/local information you don't have.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query — be specific, include location if relevant (e.g., 'florists Milwaukee WI under $3000')" },
      },
      required: ["query"],
    },
  },
];

/**
 * Execute a tool call and return the result.
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient<Database>,
  weddingId: string,
  userId?: string
): Promise<string> {
  try {
    switch (toolName) {
      case "add_guest": {
        const { data: existing } = await supabase
          .from("guests").select("id").eq("wedding_id", weddingId)
          .eq("name", input.name as string).is("deleted_at", null).limit(1);
        if (existing && existing.length > 0) return `${input.name} is already on the guest list.`;

        await supabase.from("guests").insert({
          wedding_id: weddingId,
          name: input.name as string,
          email: (input.email as string) || null,
          role: (input.role as string) || "friend",
          group_name: (input.group_name as string) || null,
          meal_preference: (input.meal_preference as string) || null,
          rsvp_status: "not_invited",
        });
        return `Added ${input.name} to the guest list.`;
      }

      case "update_guest_rsvp": {
        const { data: guest } = await supabase
          .from("guests").select("id, name").eq("wedding_id", weddingId)
          .ilike("name", `%${input.guest_name}%`).is("deleted_at", null).limit(1).single();
        if (!guest) return `Could not find a guest named "${input.guest_name}".`;

        await supabase.from("guests").update({ rsvp_status: input.rsvp_status as string })
          .eq("id", (guest as { id: string }).id);
        return `Updated ${(guest as { name: string }).name}'s RSVP to ${input.rsvp_status}.`;
      }

      case "add_task": {
        await supabase.from("tasks").insert({
          wedding_id: weddingId,
          title: input.title as string,
          category: (input.category as string) || "Planning",
          due_date: (input.due_date as string) || null,
          notes: (input.notes as string) || null,
          completed: false,
          is_system_generated: false,
        });
        return `Added task: "${input.title}"${input.due_date ? ` (due ${input.due_date})` : ""}.`;
      }

      case "complete_task": {
        const { data: task } = await supabase
          .from("tasks").select("id, title").eq("wedding_id", weddingId)
          .ilike("title", `%${input.task_title}%`).is("deleted_at", null).eq("completed", false)
          .limit(1).single();
        if (!task) return `Could not find an incomplete task matching "${input.task_title}".`;

        await supabase.from("tasks").update({ completed: true })
          .eq("id", (task as { id: string }).id);
        return `Marked "${(task as { title: string }).title}" as complete!`;
      }

      case "add_vendor": {
        await supabase.from("vendors").insert({
          wedding_id: weddingId,
          name: input.name as string,
          category: input.category as string,
          status: "searching",
          poc_name: (input.poc_name as string) || null,
          poc_email: (input.poc_email as string) || null,
          poc_phone: (input.poc_phone as string) || null,
          amount: (input.amount as number) || null,
          notes: (input.notes as string) || null,
        });
        return `Added ${input.name} (${input.category}) to your vendor list.`;
      }

      case "update_vendor_status": {
        const { data: vendor } = await supabase
          .from("vendors").select("id, name").eq("wedding_id", weddingId)
          .ilike("name", `%${input.vendor_name}%`).is("deleted_at", null)
          .limit(1).single();
        if (!vendor) return `Could not find a vendor named "${input.vendor_name}".`;

        await supabase.from("vendors").update({ status: input.status as string })
          .eq("id", (vendor as { id: string }).id);
        return `Updated ${(vendor as { name: string }).name} status to ${(input.status as string).replace(/_/g, " ")}.`;
      }

      case "add_expense": {
        await supabase.from("expenses").insert({
          wedding_id: weddingId,
          description: input.description as string,
          category: input.category as string,
          estimated: (input.estimated as number) || 0,
          amount_paid: (input.amount_paid as number) || 0,
          paid: false,
        });
        return `Added budget item: "${input.description}" (${input.category})${input.estimated ? ` — estimated $${input.estimated}` : ""}.`;
      }

      case "add_to_mood_board": {
        await supabase.from("mood_board_items").insert({
          wedding_id: weddingId,
          image_url: "",
          caption: input.caption as string,
          category: (input.category as string) || "General",
        });
        return `Saved to your vision board: "${input.caption}" (${input.category}).`;
      }

      case "update_key_decisions": {
        const { data: wedding } = await supabase
          .from("weddings").select("key_decisions").eq("id", weddingId).single();
        const existing = (wedding as { key_decisions: string | null } | null)?.key_decisions || "";
        const updated = existing ? `${existing}\n• ${input.info}` : `• ${input.info}`;
        await supabase.from("weddings").update({ key_decisions: updated, updated_at: new Date().toISOString() })
          .eq("id", weddingId);
        return `Got it — I'll remember that: "${input.info}"`;
      }

      case "web_search": {
        if (!process.env.TAVILY_API_KEY) {
          return "Web search is not configured. Please check your Tavily API key.";
        }

        // Rate limit
        if (userId && !canSearch(userId)) {
          return "You've reached your daily search limit (10 searches per day). Try again tomorrow!";
        }

        const query = input.query as string;

        // Check cache
        const cacheKey = query.toLowerCase().trim();
        const cached = searchCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.results;
        }

        // Execute search
        const { tavily } = await import("@tavily/core");
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

        const searchResult = await client.search(query, {
          searchDepth: "basic",
          maxResults: 5,
        });

        if (!searchResult.results || searchResult.results.length === 0) {
          return `No results found for "${query}". Try a more specific search.`;
        }

        // Format results
        const formatted = searchResult.results
          .map((r: { title: string; url: string; content: string }, i: number) =>
            `${i + 1}. **${r.title}**\n   ${r.content.slice(0, 200)}${r.content.length > 200 ? "..." : ""}\n   ${r.url}`
          )
          .join("\n\n");

        const resultText = `Search results for "${query}":\n\n${formatted}`;

        // Cache results
        searchCache.set(cacheKey, { results: resultText, expiresAt: Date.now() + CACHE_TTL });

        return resultText;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    console.error(`[CHAT TOOL] ${toolName} failed:`, err);
    return `Sorry, I couldn't complete that action. Please try doing it manually in the app.`;
  }
}
