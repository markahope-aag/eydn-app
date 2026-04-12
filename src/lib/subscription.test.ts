import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getSubscriptionStatus, requirePremium } from "./subscription";

const mockAuth = vi.mocked(auth);
const mockCreateSupabaseAdmin = vi.mocked(createSupabaseAdmin);

const FEATURES_OFF = {
  chat: false,
  webSearch: false,
  exportBinder: false,
  emailTemplates: false,
  attachments: false,
  catchUpPlans: false,
  budgetOptimizer: false,
};
const FEATURES_ON = {
  chat: true,
  webSearch: true,
  exportBinder: true,
  emailTemplates: true,
  attachments: true,
  catchUpPlans: true,
  budgetOptimizer: true,
};

function buildMockSupabase(overrides?: {
  roleData?: unknown;
  purchaseData?: unknown;
  purchaseError?: unknown;
  weddingData?: unknown;
  weddingError?: unknown;
  collabData?: unknown;
}) {
  const purchaseResult = { data: overrides?.purchaseData ?? null, error: overrides?.purchaseError ?? null };
  const weddingResult = { data: overrides?.weddingData ?? null, error: overrides?.weddingError ?? null };
  const collabResult = { data: overrides?.collabData ?? null, error: null };

  // Flexible chain that returns itself for any method, ending with single()
  function buildChain(result: unknown) {
    const obj: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "limit", "single"]) {
      obj[m] = vi.fn().mockReturnValue(obj);
    }
    obj.single = vi.fn().mockReturnValue(result);
    return obj;
  }

  const adminResult = { data: overrides?.roleData ?? null, error: null };

  const mockFrom = vi.fn((table: string) => {
    if (table === "user_roles") return buildChain(adminResult);
    if (table === "subscriber_purchases") return buildChain(purchaseResult);
    if (table === "wedding_collaborators") return buildChain(collabResult);
    return buildChain(weddingResult);
  });

  return { from: mockFrom } as unknown as ReturnType<typeof createSupabaseAdmin>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSubscriptionStatus", () => {
  it("returns no access when userId is null (not authenticated)", async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const status = await getSubscriptionStatus();

    expect(status).toEqual({
      tier: "free",
      features: FEATURES_OFF,
      hasAccess: false,
      isPaid: false,
      isBeta: false,
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: true,
    });
  });

  it("returns hasAccess=true, isPaid=true for beta role users", async () => {
    mockAuth.mockResolvedValue({ userId: "user_beta" } as Awaited<ReturnType<typeof auth>>);
    const mockSupabase = buildMockSupabase({ roleData: { role: "beta" } });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status).toEqual({
      tier: "beta",
      features: FEATURES_ON,
      hasAccess: true,
      isPaid: true,
      isBeta: true,
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: false,
    });
  });

  it("returns hasAccess=true, isPaid=true for admin role users", async () => {
    mockAuth.mockResolvedValue({ userId: "user_admin" } as Awaited<ReturnType<typeof auth>>);
    const mockSupabase = buildMockSupabase({ roleData: { role: "admin" } });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status).toEqual({
      tier: "admin",
      features: FEATURES_ON,
      hasAccess: true,
      isPaid: true,
      isBeta: false,
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: false,
    });
  });

  it("returns hasAccess=true, isPaid=true when active purchase exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as Awaited<ReturnType<typeof auth>>);
    const mockSupabase = buildMockSupabase({ purchaseData: { id: "purchase_1" } });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status).toEqual({
      tier: "pro",
      features: FEATURES_ON,
      hasAccess: true,
      isPaid: true,
      isBeta: false,
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: false,
    });
  });

  it("returns hasAccess=false when no owned wedding and no collaboration", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as Awaited<ReturnType<typeof auth>>);
    const mockSupabase = buildMockSupabase({
      purchaseData: null,
      weddingData: null,
      collabData: null,
    });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status).toEqual({
      tier: "free",
      features: FEATURES_OFF,
      hasAccess: false,
      isPaid: false,
      isBeta: false,
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: true,
    });
  });

  it("returns hasAccess=true, isTrialing=true when within trial period", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as Awaited<ReturnType<typeof auth>>);

    // Trial started 5 days ago => 9 days left
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const mockSupabase = buildMockSupabase({
      purchaseData: null,
      weddingData: { trial_started_at: fiveDaysAgo, created_at: fiveDaysAgo },
    });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status.hasAccess).toBe(true);
    expect(status.isPaid).toBe(false);
    expect(status.isTrialing).toBe(true);
    expect(status.trialDaysLeft).toBeGreaterThan(0);
    expect(status.trialDaysLeft).toBeLessThanOrEqual(14);
    expect(status.trialExpired).toBe(false);
  });

  it("returns hasAccess=false, trialExpired=true when trial has expired", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as Awaited<ReturnType<typeof auth>>);

    // Trial started 30 days ago => well past 14-day trial
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const mockSupabase = buildMockSupabase({
      purchaseData: null,
      weddingData: { trial_started_at: thirtyDaysAgo, created_at: thirtyDaysAgo },
    });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status).toEqual({
      tier: "free",
      features: FEATURES_OFF,
      hasAccess: false,
      isPaid: false,
      isBeta: false,
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: true,
    });
  });

  it("falls back to created_at when trial_started_at is null", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as Awaited<ReturnType<typeof auth>>);

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const mockSupabase = buildMockSupabase({
      purchaseData: null,
      weddingData: { trial_started_at: null, created_at: twoDaysAgo },
    });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const status = await getSubscriptionStatus();

    expect(status.hasAccess).toBe(true);
    expect(status.isTrialing).toBe(true);
    expect(status.trialDaysLeft).toBeGreaterThan(0);
  });
});

describe("requirePremium", () => {
  it("returns null when user has access", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as Awaited<ReturnType<typeof auth>>);
    const mockSupabase = buildMockSupabase({ purchaseData: { id: "purchase_1" } });
    mockCreateSupabaseAdmin.mockReturnValue(mockSupabase);

    const result = await requirePremium();
    expect(result).toBeNull();
  });

  it("returns a 403 response when user has no access", async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const result = await requirePremium();
    expect(result).not.toBeNull();
    expect((result as { status: number }).status).toBe(403);
  });
});
