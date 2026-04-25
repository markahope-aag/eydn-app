import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/backend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { BUDGET_TEMPLATE } from "@/lib/budget/budget-template";

type AdminSupabase = SupabaseClient<Database>;

type HandoffInput = {
  email: string;
  name: string | null;
  budget: number;
  guests: number;
  state: string;
  month: number;
};

/**
 * From a 1–12 month value, return a placeholder wedding date string (YYYY-MM-DD)
 * representing the 15th of the next occurrence of that month — this year if the
 * month is still ahead of `now`, otherwise next year. Used only as a fallback
 * anchor for the wedding_milestones email sequence; replaced the moment the
 * user sets their actual date in the dashboard.
 *
 * Returns null for invalid input so the caller can leave inferred_date null.
 */
export function inferWeddingDate(month: number, now: Date = new Date()): string | null {
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1–12
  const year = month >= currentMonth ? currentYear : currentYear + 1;
  return `${year}-${String(month).padStart(2, "0")}-15`;
}

type HandoffResult = {
  signInUrl: string;
  isNewUser: boolean;
  userId: string;
  weddingId: string;
};

/**
 * Maps the wedding budget calculator's 10 category taxonomy onto the
 * BUDGET_TEMPLATE line items the rest of Eydn uses. For each calculator
 * category we pick a single "anchor" line item to receive the full
 * allocation. Every other line item stays at $0 so the couple can split
 * the category amount later when they refine their budget.
 *
 * Calculator pcts are copied from src/components/tools/WeddingBudgetCalculator.tsx
 * — keep them in sync if the calculator's breakdown changes.
 */
const CALCULATOR_ANCHORS: Record<
  string,
  { pct: number; category: string; description: string }
> = {
  Venue: { pct: 0.238, category: "Ceremony & Venue", description: "Venue Rentals" },
  "Catering & bar": { pct: 0.192, category: "Food & Beverage", description: "Caterer" },
  "Photography & video": { pct: 0.12, category: "Photography & Video", description: "Photographer" },
  "Florals & decor": { pct: 0.09, category: "Florals & Decor", description: "Flowers" },
  "Attire & beauty": { pct: 0.065, category: "Attire & Beauty", description: "Dress" },
  "Music & entertainment": { pct: 0.06, category: "Music & Entertainment", description: "Wedding DJ" },
  "Rehearsal dinner": { pct: 0.04, category: "Rehearsal", description: "Rehearsal Dinner" },
  "Stationery & gifts": { pct: 0.025, category: "Stationery & Postage", description: "Invites" },
  Transportation: { pct: 0.02, category: "Gifts & Favors", description: "Transportation / Shuttle" },
  "Ceremony & officiant": { pct: 0.015, category: "Ceremony & Venue", description: "Officiant Fee" },
};

function computeAllocations(budget: number): Map<string, number> {
  // Key is `${category}|${description}` — matches the unique BUDGET_TEMPLATE rows.
  const allocations = new Map<string, number>();
  for (const anchor of Object.values(CALCULATOR_ANCHORS)) {
    const key = `${anchor.category}|${anchor.description}`;
    const amount = Math.round(budget * anchor.pct);
    // Multiple anchors can land on the same (category, description) — sum them.
    allocations.set(key, (allocations.get(key) || 0) + amount);
  }
  return allocations;
}

async function findClerkUserByEmail(email: string): Promise<User | null> {
  const clerk = await clerkClient();
  try {
    const res = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    return res.data[0] || null;
  } catch (err) {
    console.error("[CALCULATOR HANDOFF] getUserList failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function createClerkUser(email: string, name: string | null): Promise<User> {
  const clerk = await clerkClient();
  const firstName = name?.split(" ")[0] || undefined;
  const lastName = name?.split(" ").slice(1).join(" ") || undefined;
  return clerk.users.createUser({
    emailAddress: [email],
    firstName,
    lastName,
    skipPasswordRequirement: true,
  });
}

async function createSignInUrl(userId: string): Promise<string> {
  const clerk = await clerkClient();
  const token = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 60 * 60 * 24, // 24 hours
  });
  return token.url;
}

async function seedExpensesFromCalculator(
  supabase: AdminSupabase,
  weddingId: string,
  budget: number
): Promise<void> {
  const allocations = computeAllocations(budget);
  const rows = BUDGET_TEMPLATE.map((item) => {
    const key = `${item.category}|${item.description}`;
    return {
      wedding_id: weddingId,
      description: item.description,
      category: item.category,
      estimated: allocations.get(key) || 0,
      paid: false,
    };
  });
  await supabase.from("expenses").insert(rows);
}

/**
 * Take the calculator save and hand the user off into Eydn proper —
 * finds or creates their Clerk account, finds or creates a minimal
 * wedding row with the budget pre-loaded, activates the 14-day trial,
 * and returns a one-time sign-in URL they can use to land directly
 * in /dashboard without entering a password.
 *
 * Idempotent: calling this twice for the same email returns a fresh
 * sign-in URL each time but never overwrites an existing wedding's
 * budget or expenses.
 */
export async function handoffCalculatorToEydn(
  supabase: AdminSupabase,
  input: HandoffInput
): Promise<HandoffResult | null> {
  try {
    let user = await findClerkUserByEmail(input.email);
    const isNewUser = !user;
    if (!user) {
      user = await createClerkUser(input.email, input.name);
    }

    const { data: existingWedding } = await supabase
      .from("weddings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let weddingId: string;
    if (existingWedding) {
      weddingId = (existingWedding as { id: string }).id;
    } else {
      const nowIso = new Date().toISOString();
      const inferredDate = inferWeddingDate(input.month);
      const { data: newWedding, error } = await supabase
        .from("weddings")
        .insert({
          user_id: user.id,
          partner1_name: input.name?.trim() || "Partner 1",
          partner2_name: "",
          budget: input.budget,
          guest_count_estimate: input.guests,
          trial_started_at: nowIso,
          inferred_date: inferredDate,
        })
        .select("id")
        .single();
      if (error || !newWedding) {
        console.error("[CALCULATOR HANDOFF] wedding insert failed:", error?.message);
        return null;
      }
      weddingId = (newWedding as { id: string }).id;

      await seedExpensesFromCalculator(supabase, weddingId, input.budget);
    }

    const signInUrl = await createSignInUrl(user.id);

    return { signInUrl, isNewUser, userId: user.id, weddingId };
  } catch (err) {
    console.error("[CALCULATOR HANDOFF] failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
