import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { AI, CACHE_TTL } from "@/lib/config";

/**
 * Tools that Eydn can use to take actions in the app.
 * Each tool maps to a real API operation on the user's wedding data.
 */

// ─── Search rate limiting (10 searches/user/day) ────────────────────────────
const searchCounts = new Map<string, { count: number; resetAt: number }>();

function canSearch(userId: string): boolean {
  const now = Date.now();
  const entry = searchCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    searchCounts.set(userId, { count: 1, resetAt: now + CACHE_TTL.WEB_SEARCH });
    return true;
  }
  if (entry.count >= AI.SEARCH_DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Search result cache (24h) ──────────────────────────────────────────────
const searchCache = new Map<string, { results: string; expiresAt: number }>();

// Escape LIKE wildcards so user-supplied text matches literally.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

// ─── Runtime validation ────────────────────────────────────────────────────
// Claude's tool input_schema is a client-side hint — models can still emit
// values that violate it. These assertions are the backstop before any DB write.

class ToolValidationError extends Error {}

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 2000;
const MAX_MONEY = 1_000_000;

const RSVP_STATUSES = ["not_invited", "invite_sent", "pending", "accepted", "declined"] as const;
const VENDOR_STATUSES = ["searching", "contacted", "quote_received", "booked", "deposit_paid", "paid_in_full"] as const;
const GUEST_ROLES = ["family", "friend", "wedding_party", "coworker", "plus_one", "other"] as const;
const MOOD_CATEGORIES = [
  "General", "Ceremony", "Reception", "Florals", "Table Settings", "Lighting",
  "Attire", "Hair & Makeup", "Cake & Desserts", "Stationery", "Colors & Palette",
  "Photo Inspo", "Favors", "Other",
] as const;

function assertString(val: unknown, field: string, max = MAX_SHORT): string {
  if (typeof val !== "string") throw new ToolValidationError(`${field} must be text.`);
  const trimmed = val.trim();
  if (!trimmed) throw new ToolValidationError(`${field} cannot be empty.`);
  if (trimmed.length > max) throw new ToolValidationError(`${field} is too long (max ${max} characters).`);
  return trimmed;
}

function assertStringOrNull(val: unknown, field: string, max = MAX_SHORT): string | null {
  if (val == null || val === "") return null;
  return assertString(val, field, max);
}

function assertMoneyOrNull(val: unknown, field: string): number | null {
  if (val == null) return null;
  if (typeof val !== "number" || !Number.isFinite(val)) {
    throw new ToolValidationError(`${field} must be a number.`);
  }
  if (val < 0) throw new ToolValidationError(`${field} cannot be negative.`);
  if (val > MAX_MONEY) {
    throw new ToolValidationError(`${field} exceeds maximum ($${MAX_MONEY.toLocaleString()}).`);
  }
  return val;
}

function assertEmailOrNull(val: unknown, field = "Email"): string | null {
  if (val == null || val === "") return null;
  if (typeof val !== "string") throw new ToolValidationError(`${field} must be text.`);
  const trimmed = val.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ToolValidationError(`"${trimmed}" is not a valid email address.`);
  }
  if (trimmed.length > MAX_SHORT) {
    throw new ToolValidationError(`${field} is too long.`);
  }
  return trimmed;
}

function assertDateOrNull(val: unknown, field: string): string | null {
  if (val == null || val === "") return null;
  if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    throw new ToolValidationError(`${field} must be in YYYY-MM-DD format.`);
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) {
    throw new ToolValidationError(`${field} is not a valid date.`);
  }
  return val;
}

function assertEnum<T extends string>(val: unknown, allowed: readonly T[], field: string): T {
  if (typeof val !== "string" || !allowed.includes(val as T)) {
    throw new ToolValidationError(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return val as T;
}

function assertEnumOrDefault<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  if (val == null || val === "") return fallback;
  return assertEnum(val, allowed, "value");
}

type NamedRow = { id: string; name?: string | null; title?: string | null };

function labelOf(row: NamedRow): string {
  return (row.name ?? row.title ?? "") as string;
}

type Resolution =
  | { kind: "found"; row: NamedRow }
  | { kind: "none" }
  | { kind: "ambiguous"; labels: string[] };

// Two-stage lookup: exact case-insensitive first, then fuzzy fallback.
// Never returns a match when results are ambiguous — caller must surface
// the disambiguation so Claude can ask the user or retry with a specific name.
async function resolveByName(
  rows: NamedRow[] | null,
  fuzzyFetch: () => Promise<NamedRow[] | null>
): Promise<Resolution> {
  if (rows && rows.length === 1) return { kind: "found", row: rows[0] };
  if (rows && rows.length > 1) {
    return { kind: "ambiguous", labels: rows.map(labelOf) };
  }
  const fuzzy = await fuzzyFetch();
  if (!fuzzy || fuzzy.length === 0) return { kind: "none" };
  if (fuzzy.length === 1) return { kind: "found", row: fuzzy[0] };
  return { kind: "ambiguous", labels: fuzzy.map(labelOf) };
}

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
        group_name: { type: "string", description: "Group name (e.g., 'Partner 1's Family')" },
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
        const name = assertString(input.name, "Guest name");
        const email = assertEmailOrNull(input.email);
        const role = assertEnumOrDefault(input.role, GUEST_ROLES, "friend");
        const group_name = assertStringOrNull(input.group_name, "Group name");
        const meal_preference = assertStringOrNull(input.meal_preference, "Meal preference");

        const { data: existing } = await supabase
          .from("guests").select("id").eq("wedding_id", weddingId)
          .ilike("name", name).is("deleted_at", null).limit(1);
        if (existing && existing.length > 0) return `${name} is already on the guest list.`;

        await supabase.from("guests").insert({
          wedding_id: weddingId,
          name,
          email,
          role,
          group_name,
          meal_preference,
          rsvp_status: "not_invited",
        });
        return `Added ${name} to the guest list.`;
      }

      case "update_guest_rsvp": {
        const needle = assertString(input.guest_name, "Guest name");
        const rsvp_status = assertEnum(input.rsvp_status, RSVP_STATUSES, "RSVP status");

        const { data: exact } = await supabase
          .from("guests").select("id, name").eq("wedding_id", weddingId)
          .ilike("name", needle).is("deleted_at", null).limit(2);

        const resolution = await resolveByName(exact as NamedRow[] | null, async () => {
          const { data } = await supabase
            .from("guests").select("id, name").eq("wedding_id", weddingId)
            .ilike("name", `%${escapeLike(needle)}%`).is("deleted_at", null).limit(5);
          return data as NamedRow[] | null;
        });

        if (resolution.kind === "none") return `Could not find a guest named "${needle}".`;
        if (resolution.kind === "ambiguous") {
          return `Multiple guests match "${needle}": ${resolution.labels.join(", ")}. Please be more specific.`;
        }

        await supabase.from("guests").update({ rsvp_status })
          .eq("id", resolution.row.id);
        return `Updated ${labelOf(resolution.row)}'s RSVP to ${rsvp_status}.`;
      }

      case "add_task": {
        const title = assertString(input.title, "Task title", MAX_MEDIUM);
        const category = assertStringOrNull(input.category, "Category") ?? "Planning";
        const due_date = assertDateOrNull(input.due_date, "Due date");
        const notes = assertStringOrNull(input.notes, "Notes", MAX_LONG);

        await supabase.from("tasks").insert({
          wedding_id: weddingId,
          title,
          category,
          due_date,
          notes,
          completed: false,
          is_system_generated: false,
        });
        return `Added task: "${title}"${due_date ? ` (due ${due_date})` : ""}.`;
      }

      case "complete_task": {
        const needle = assertString(input.task_title, "Task title");

        const { data: exact } = await supabase
          .from("tasks").select("id, title").eq("wedding_id", weddingId)
          .ilike("title", needle).is("deleted_at", null).eq("completed", false).limit(2);

        const resolution = await resolveByName(exact as NamedRow[] | null, async () => {
          const { data } = await supabase
            .from("tasks").select("id, title").eq("wedding_id", weddingId)
            .ilike("title", `%${escapeLike(needle)}%`).is("deleted_at", null).eq("completed", false).limit(5);
          return data as NamedRow[] | null;
        });

        if (resolution.kind === "none") return `Could not find an incomplete task matching "${needle}".`;
        if (resolution.kind === "ambiguous") {
          return `Multiple tasks match "${needle}": ${resolution.labels.join(", ")}. Please be more specific.`;
        }

        await supabase.from("tasks").update({ completed: true })
          .eq("id", resolution.row.id);
        return `Marked "${labelOf(resolution.row)}" as complete!`;
      }

      case "add_vendor": {
        const name = assertString(input.name, "Vendor name");
        const category = assertString(input.category, "Category");
        const poc_name = assertStringOrNull(input.poc_name, "Contact name");
        const poc_email = assertEmailOrNull(input.poc_email, "Contact email");
        const poc_phone = assertStringOrNull(input.poc_phone, "Phone");
        const amount = assertMoneyOrNull(input.amount, "Amount");
        const notes = assertStringOrNull(input.notes, "Notes", MAX_LONG);

        await supabase.from("vendors").insert({
          wedding_id: weddingId,
          name,
          category,
          status: "searching",
          poc_name,
          poc_email,
          poc_phone,
          amount,
          notes,
        });
        return `Added ${name} (${category}) to your vendor list.`;
      }

      case "update_vendor_status": {
        const needle = assertString(input.vendor_name, "Vendor name");
        const status = assertEnum(input.status, VENDOR_STATUSES, "Status");

        const { data: exact } = await supabase
          .from("vendors").select("id, name").eq("wedding_id", weddingId)
          .ilike("name", needle).is("deleted_at", null).limit(2);

        const resolution = await resolveByName(exact as NamedRow[] | null, async () => {
          const { data } = await supabase
            .from("vendors").select("id, name").eq("wedding_id", weddingId)
            .ilike("name", `%${escapeLike(needle)}%`).is("deleted_at", null).limit(5);
          return data as NamedRow[] | null;
        });

        if (resolution.kind === "none") return `Could not find a vendor named "${needle}".`;
        if (resolution.kind === "ambiguous") {
          return `Multiple vendors match "${needle}": ${resolution.labels.join(", ")}. Please be more specific.`;
        }

        await supabase.from("vendors").update({ status })
          .eq("id", resolution.row.id);
        return `Updated ${labelOf(resolution.row)} status to ${status.replace(/_/g, " ")}.`;
      }

      case "add_expense": {
        const description = assertString(input.description, "Description", MAX_MEDIUM);
        const category = assertString(input.category, "Category");
        const estimated = assertMoneyOrNull(input.estimated, "Estimated cost") ?? 0;
        const amount_paid = assertMoneyOrNull(input.amount_paid, "Amount paid") ?? 0;

        await supabase.from("expenses").insert({
          wedding_id: weddingId,
          description,
          category,
          estimated,
          amount_paid,
          paid: false,
        });
        return `Added budget item: "${description}" (${category})${estimated ? ` — estimated $${estimated}` : ""}.`;
      }

      case "add_to_mood_board": {
        const caption = assertString(input.caption, "Caption", MAX_MEDIUM);
        const category = assertEnum(input.category, MOOD_CATEGORIES, "Category");

        await supabase.from("mood_board_items").insert({
          wedding_id: weddingId,
          image_url: "",
          caption,
          category,
        });
        return `Saved to your vision board: "${caption}" (${category}).`;
      }

      case "update_key_decisions": {
        const info = assertString(input.info, "Info", 1000);

        const { data: wedding } = await supabase
          .from("weddings").select("key_decisions").eq("id", weddingId).single();
        const existing = (wedding as { key_decisions: string | null } | null)?.key_decisions || "";
        const updated = existing ? `${existing}\n• ${info}` : `• ${info}`;
        await supabase.from("weddings").update({ key_decisions: updated, updated_at: new Date().toISOString() })
          .eq("id", weddingId);
        return `Got it — I'll remember that: "${info}"`;
      }

      case "web_search": {
        if (!process.env.TAVILY_API_KEY) {
          return "Web search is not configured. Please check your Tavily API key.";
        }

        // Rate limit
        if (userId && !canSearch(userId)) {
          return "You've reached your daily search limit (10 searches per day). Try again tomorrow!";
        }

        const query = assertString(input.query, "Search query", MAX_MEDIUM);

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
        searchCache.set(cacheKey, { results: resultText, expiresAt: Date.now() + CACHE_TTL.WEB_SEARCH });

        return resultText;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    if (err instanceof ToolValidationError) return err.message;
    console.error(`[CHAT TOOL] ${toolName} failed:`, err);
    return `Sorry, I couldn't complete that action. Please try doing it manually in the app.`;
  }
}
