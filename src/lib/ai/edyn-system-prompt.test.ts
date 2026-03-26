 
import { describe, it, expect } from "vitest";
import { buildEdynSystemPrompt } from "./edyn-system-prompt";
import type { Database } from "@/lib/supabase/types";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

function makeWedding(overrides: Partial<Wedding> = {}): Wedding {
  return {
    id: "w-1",
    user_id: "user-1",
    partner1_name: "Alice",
    partner2_name: "Bob",
    date: null,
    venue: null,
    budget: null,
    guest_count_estimate: null,
    style_description: null,
    has_wedding_party: null,
    wedding_party_count: null,
    has_pre_wedding_events: null,
    has_honeymoon: null,
    trial_started_at: null,
    website_slug: null,
    website_enabled: false,
    website_headline: null,
    website_story: null,
    website_cover_url: null,
    website_schedule: [],
    website_travel_info: null,
    website_accommodations: null,
    website_faq: [],
    website_couple_photo_url: null,
    phase: "active",
    memory_plan_active: false,
    memory_plan_expires_at: null,
    key_decisions: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeContext(overrides: {
  wedding?: Partial<Wedding>;
  taskStats?: { total: number; completed: number };
  vendorCount?: number;
  guestCount?: number;
  budgetSpent?: number;
} = {}) {
  return {
    wedding: makeWedding(overrides.wedding),
    taskStats: overrides.taskStats ?? { total: 0, completed: 0 },
    vendorCount: overrides.vendorCount ?? 0,
    guestCount: overrides.guestCount ?? 0,
    budgetSpent: overrides.budgetSpent ?? 0,
  };
}

describe("buildEdynSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const result = buildEdynSystemPrompt(makeContext());
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes partner names from wedding data", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { partner1_name: "Luna", partner2_name: "Sam" } }),
    );
    expect(result).toContain("Luna");
    expect(result).toContain("Sam");
  });

  it("includes wedding date when provided", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { date: "2026-09-15" } }),
    );
    expect(result).toContain("2026-09-15");
  });

  it("shows 'Not set yet' when date is null", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { date: null } }),
    );
    expect(result).toContain("Not set yet");
  });

  it("includes venue when provided", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { venue: "Rose Garden Estate" } }),
    );
    expect(result).toContain("Rose Garden Estate");
  });

  it("shows 'Not decided yet' when venue is null", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { venue: null } }),
    );
    expect(result).toContain("Not yet booked");
  });

  it("includes task completion stats", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ taskStats: { total: 20, completed: 8 } }),
    );
    expect(result).toContain("8 of 20 complete");
    expect(result).toContain("40%");
  });

  it("handles zero total tasks without division error", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ taskStats: { total: 0, completed: 0 } }),
    );
    expect(result).toContain("0 of 0 complete");
    expect(result).toContain("0%");
  });

  it("includes vendor count", () => {
    const result = buildEdynSystemPrompt(makeContext({ vendorCount: 5 }));
    expect(result).toContain("VENDORS: 5 tracked");
  });

  it("includes guest count", () => {
    const result = buildEdynSystemPrompt(makeContext({ guestCount: 150 }));
    expect(result).toContain("GUESTS: 150 on list");
  });

  it("includes budget information when budget is set", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { budget: 50000 }, budgetSpent: 12000 }),
    );
    expect(result).toContain("$50,000");
    expect(result).toContain("$12,000");
    expect(result).toContain("$38,000");
  });

  it("shows 'Not set' when budget is null", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { budget: null } }),
    );
    expect(result).toContain("BUDGET: Not set");
  });

  it("handles null/missing optional fields gracefully", () => {
    const result = buildEdynSystemPrompt(
      makeContext({
        wedding: {
          date: null,
          venue: null,
          budget: null,
          style_description: null,
        },
      }),
    );
    // Should not throw and should contain fallback text
    expect(result).toContain("Not set yet");
    expect(result).toContain("Not yet booked");
    expect(result).toContain("BUDGET: Not set");
    // style_description is null so that line should not appear
    expect(result).not.toContain("Style:");
  });

  it("includes style description when provided", () => {
    const result = buildEdynSystemPrompt(
      makeContext({ wedding: { style_description: "Rustic bohemian" } }),
    );
    expect(result).toContain("Rustic bohemian");
  });
});
