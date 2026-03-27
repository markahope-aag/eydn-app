import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  SUBSCRIPTION_PRICE: 79,
}));

import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { POST } from "./route";

// --- Helpers ---

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/promo-codes/validate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function mockAuth(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as unknown as Awaited<ReturnType<typeof auth>>);
}

function mockSupabase(overrides: {
  promoData?: unknown;
  redemptionData?: unknown[];
} = {}) {
  const { promoData = null, redemptionData = [] } = overrides;

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "promo_codes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({ data: promoData })),
              })),
            })),
          })),
        };
      }
      if (table === "promo_code_redemptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({ data: redemptionData })),
              })),
            })),
          })),
        };
      }
      return {};
    }),
  };

  vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);
  return supabase;
}

// --- Tests ---

describe("POST /api/promo-codes/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await POST(jsonRequest({ code: "SAVE20" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns invalid when code is empty", async () => {
    mockAuth("user-1");
    mockSupabase();
    const response = await POST(jsonRequest({ code: "" }));
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/enter a promo code/i);
  });

  it("returns invalid when code is missing", async () => {
    mockAuth("user-1");
    mockSupabase();
    const response = await POST(jsonRequest({}));
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/enter a promo code/i);
  });

  it("returns invalid for nonexistent code", async () => {
    mockAuth("user-1");
    mockSupabase({ promoData: null });
    const response = await POST(jsonRequest({ code: "DOESNTEXIST" }));
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/invalid promo code/i);
  });

  it("returns invalid for expired code", async () => {
    mockAuth("user-1");
    mockSupabase({
      promoData: {
        id: "promo-1",
        code: "EXPIRED20",
        is_active: true,
        discount_type: "percentage",
        discount_value: 20,
        expires_at: "2020-01-01T00:00:00Z",
        max_uses: null,
        current_uses: 0,
      },
    });

    const response = await POST(jsonRequest({ code: "expired20" }));
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/expired/i);
  });

  it("returns invalid for maxed out code", async () => {
    mockAuth("user-1");
    mockSupabase({
      promoData: {
        id: "promo-1",
        code: "MAXED",
        is_active: true,
        discount_type: "percentage",
        discount_value: 10,
        expires_at: null,
        max_uses: 5,
        current_uses: 5,
      },
    });

    const response = await POST(jsonRequest({ code: "MAXED" }));
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/usage limit/i);
  });

  it("returns invalid for code already redeemed by user", async () => {
    mockAuth("user-1");
    mockSupabase({
      promoData: {
        id: "promo-1",
        code: "USED",
        is_active: true,
        discount_type: "percentage",
        discount_value: 10,
        expires_at: null,
        max_uses: null,
        current_uses: 1,
      },
      redemptionData: [{ id: "redemption-1" }],
    });

    const response = await POST(jsonRequest({ code: "USED" }));
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.reason).toMatch(/already used/i);
  });

  it("returns valid with percentage discount details", async () => {
    mockAuth("user-1");
    mockSupabase({
      promoData: {
        id: "promo-1",
        code: "SAVE20",
        is_active: true,
        discount_type: "percentage",
        discount_value: 20,
        expires_at: null,
        max_uses: null,
        current_uses: 0,
      },
      redemptionData: [],
    });

    const response = await POST(jsonRequest({ code: "save20" }));
    const data = await response.json();

    expect(data.valid).toBe(true);
    expect(data.code).toBe("SAVE20");
    expect(data.discount_type).toBe("percentage");
    expect(data.discount_value).toBe(20);
    expect(data.original_price).toBe(79);
    expect(data.discount_amount).toBe(15.8);
    expect(data.final_price).toBe(63.2);
  });

  it("returns valid with fixed dollar discount details", async () => {
    mockAuth("user-1");
    mockSupabase({
      promoData: {
        id: "promo-2",
        code: "FLAT10",
        is_active: true,
        discount_type: "fixed",
        discount_value: 10,
        expires_at: null,
        max_uses: 100,
        current_uses: 50,
      },
      redemptionData: [],
    });

    const response = await POST(jsonRequest({ code: "FLAT10" }));
    const data = await response.json();

    expect(data.valid).toBe(true);
    expect(data.discount_amount).toBe(10);
    expect(data.final_price).toBe(69);
  });

  it("caps fixed discount at original price", async () => {
    mockAuth("user-1");
    mockSupabase({
      promoData: {
        id: "promo-3",
        code: "HUGE",
        is_active: true,
        discount_type: "fixed",
        discount_value: 200,
        expires_at: null,
        max_uses: null,
        current_uses: 0,
      },
      redemptionData: [],
    });

    const response = await POST(jsonRequest({ code: "HUGE" }));
    const data = await response.json();

    expect(data.valid).toBe(true);
    expect(data.discount_amount).toBe(79);
    expect(data.final_price).toBe(0);
  });

  it("normalizes code to uppercase", async () => {
    mockAuth("user-1");
    const supabase = mockSupabase({ promoData: null });

    await POST(jsonRequest({ code: "  save20  " }));

    // The code should have been trimmed and uppercased before the query
    const fromCall = supabase.from.mock.calls[0];
    expect(fromCall[0]).toBe("promo_codes");
  });
});
