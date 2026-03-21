 
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => mockSupabase,
}));

vi.mock("@/lib/tasks/seed-tasks", () => ({ generateTasks: vi.fn(() => []) }));
vi.mock("@/lib/budget/budget-template", () => ({ BUDGET_TEMPLATE: [] }));

import { POST } from "./route";

// Helper to build a Request with JSON body
function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function badJsonRequest(): Request {
  return new Request("http://localhost/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "NOT JSON",
  });
}

// Chainable supabase mock builder
function chain(terminal?: unknown) {
  const obj: Record<string, unknown> = {};
  for (const method of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "single",
    "order",
    "limit",
    "head",
  ]) {
    obj[method] = vi.fn().mockReturnValue(obj);
  }
  if (terminal !== undefined) {
    obj.single = vi.fn().mockResolvedValue(terminal);
  }
  return obj;
}

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await POST(jsonRequest({ partner1_name: "A", partner2_name: "B" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when partner1_name missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await POST(jsonRequest({ partner2_name: "B" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("partner1_name");
  });

  it("returns 400 when partner2_name missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await POST(jsonRequest({ partner1_name: "A" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("partner2_name");
  });

  it("creates wedding with valid data", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    // First from("weddings").select("id").eq(...).single() → no existing wedding
    const selectChain = chain({ data: null });
    // insert chain
    const insertChain = chain();
    (insertChain as Record<string, unknown>).single = vi
      .fn()
      .mockResolvedValue({ data: { id: "wedding_1" }, error: null });
    // questionnaire upsert
    const upsertChain = chain({ data: null, error: null });
    // expenses count
    const expensesChain = chain();
    (expensesChain as Record<string, unknown>).single = vi
      .fn()
      .mockResolvedValue({ count: 0 });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return selectChain; // weddings select existing
      if (callIndex === 2) return insertChain; // weddings insert
      if (callIndex === 3) return upsertChain; // questionnaire_responses upsert
      if (callIndex === 4) return expensesChain; // expenses count
      if (callIndex === 5) return chain({ data: null, error: null }); // expenses insert
      return chain({ data: null, error: null });
    });

    const res = await POST(
      jsonRequest({
        partner1_name: "Alice",
        partner2_name: "Bob",
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.wedding_id).toBe("wedding_1");
  });

  it("returns 400 with malformed JSON", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await POST(badJsonRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });

  it("updates existing wedding instead of creating new one", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    // First from("weddings").select("id").eq(...).single() → existing wedding found
    const selectChain = chain({ data: { id: "existing_wedding" } });
    // update chain
    const updateChain = chain();
    (updateChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ error: null });
    // questionnaire upsert
    const upsertChain = chain({ data: null, error: null });
    // expenses count
    const expensesChain = chain();
    (expensesChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ count: 5 });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return selectChain; // weddings select existing
      if (callIndex === 2) return updateChain; // weddings update
      if (callIndex === 3) return upsertChain; // questionnaire_responses upsert
      if (callIndex === 4) return expensesChain; // expenses count (returns 5 = existing)
      return chain({ data: null, error: null });
    });

    const res = await POST(
      jsonRequest({ partner1_name: "Alice", partner2_name: "Bob" })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.wedding_id).toBe("existing_wedding");
  });

  it("generates tasks when date is provided", async () => {
    const { generateTasks } = await import("@/lib/tasks/seed-tasks");

    mockAuth.mockResolvedValue({ userId: "user_123" });

    const selectChain = chain({ data: null }); // no existing wedding
    const insertChain = chain();
    (insertChain as Record<string, unknown>).single = vi
      .fn()
      .mockResolvedValue({ data: { id: "wedding_1" }, error: null });
    const upsertChain = chain({ data: null, error: null });
    // tasks delete chain
    const deleteChain = chain();
    (deleteChain as Record<string, unknown>).eq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    // tasks insert chain
    const taskInsertChain = chain({ data: null, error: null });
    // expenses count
    const expensesChain = chain();
    (expensesChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ count: 0 });
    // expenses insert
    const expensesInsertChain = chain({ data: null, error: null });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return selectChain;        // weddings select existing
      if (callIndex === 2) return insertChain;         // weddings insert
      if (callIndex === 3) return upsertChain;         // questionnaire_responses upsert
      if (callIndex === 4) return deleteChain;         // tasks delete
      if (callIndex === 5) return taskInsertChain;     // tasks insert
      if (callIndex === 6) return expensesChain;       // expenses count
      if (callIndex === 7) return expensesInsertChain; // expenses insert
      return chain({ data: null, error: null });
    });

    const res = await POST(
      jsonRequest({
        partner1_name: "Alice",
        partner2_name: "Bob",
        date: "2027-06-15",
        has_wedding_party: true,
        has_honeymoon: false,
        booked_vendors: ["Photographer"],
      })
    );

    expect(res.status).toBe(201);
    expect(generateTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        weddingId: "wedding_1",
        weddingDate: "2027-06-15",
        hasWeddingParty: true,
        hasHoneymoon: false,
        bookedVendors: ["Photographer"],
      })
    );
  });

  it("skips budget seeding when expenses already exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const selectChain = chain({ data: null });
    const insertChain = chain();
    (insertChain as Record<string, unknown>).single = vi
      .fn()
      .mockResolvedValue({ data: { id: "wedding_1" }, error: null });
    const upsertChain = chain({ data: null, error: null });
    const expensesChain = chain();
    (expensesChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ count: 10 });

    let callIndex = 0;
    const insertSpy = vi.fn().mockReturnValue(chain({ data: null, error: null }));
    mockFrom.mockImplementation((table: string) => {
      callIndex++;
      if (callIndex === 1) return selectChain;
      if (callIndex === 2) return insertChain;
      if (callIndex === 3) return upsertChain;
      if (callIndex === 4) return expensesChain; // expenses count = 10
      // If we get a 5th call to expenses insert, it shouldn't happen
      if (table === "expenses" && callIndex >= 5) {
        return { insert: insertSpy };
      }
      return chain({ data: null, error: null });
    });

    const res = await POST(
      jsonRequest({ partner1_name: "Alice", partner2_name: "Bob" })
    );

    expect(res.status).toBe(201);
    // expenses.insert should NOT have been called since count > 0
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid date format", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await POST(
      jsonRequest({ partner1_name: "Alice", partner2_name: "Bob", date: "June 15 2027" })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });
});
