import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

type AuthResult = Awaited<ReturnType<typeof import("@/lib/auth").getWeddingForUser>>;

// --- Mocks ---

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function createMockSupabase(overrides: {
  selectData?: unknown[];
} = {}) {
  const { selectData = [] } = overrides;

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: selectData })),
          })),
        })),
      })),
      insert: vi.fn(() => ({})),
    })),
  };
}

let mockSupabase = createMockSupabase();

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  getSubscriptionStatus: vi.fn(),
}));

vi.mock("@/lib/tool-call-counter", () => ({
  getToolCallMeter: vi.fn(async () => ({ used: 0, limit: null, remaining: null })),
  incrementToolCallCount: vi.fn(async () => 1),
}));

vi.mock("@/lib/ai/claude-client", () => ({
  getClaudeClient: vi.fn(),
}));

vi.mock("@/lib/ai/edyn-system-prompt", () => ({
  buildEdynSystemPrompt: vi.fn(() => "system prompt"),
}));

import { getWeddingForUser } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";
import { GET, POST } from "./route";

const TRIALING_STATUS = {
  tier: "trialing" as const,
  features: {
    chat: true, webSearch: true, exportBinder: true, emailTemplates: true,
    attachments: true, catchUpPlans: true, budgetOptimizer: true, vendorLookup: true,
  },
  hasAccess: true,
  isPaid: false,
  isBeta: false,
  isTrialing: true,
  trialDaysLeft: 7,
  trialExpired: false,
};

const FREE_STATUS_NO_CHAT = {
  tier: "free" as const,
  features: {
    chat: false, webSearch: false, exportBinder: false, emailTemplates: false,
    attachments: false, catchUpPlans: false, budgetOptimizer: false, vendorLookup: false,
  },
  hasAccess: false,
  isPaid: false,
  isBeta: false,
  isTrialing: false,
  trialDaysLeft: 0,
  trialExpired: true,
};

// --- Helpers ---

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe("GET /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);
  });

  it("returns chat history", async () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    mockSupabase = createMockSupabase({ selectData: messages });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(messages);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(getSubscriptionStatus).mockResolvedValue(TRIALING_STATUS);
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);
  });

  it("returns 403 when premium check fails", async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(FREE_STATUS_NO_CHAT);

    const response = await POST(mockRequest({ message: "Hello" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/premium/i);
  });

  it("returns 400 when message is empty", async () => {
    const response = await POST(mockRequest({ message: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/message/i);
  });

  it("returns 400 when message is whitespace only", async () => {
    const response = await POST(mockRequest({ message: "   " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/message/i);
  });

  it("returns 400 when message is missing", async () => {
    const response = await POST(mockRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/message/i);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(mockRequest({ message: "Hello" }));
    expect(response.status).toBe(401);
  });

  it("checks premium before processing message", async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(FREE_STATUS_NO_CHAT);

    const response = await POST(mockRequest({ message: "Hello" }));

    expect(getSubscriptionStatus).toHaveBeenCalled();
    expect(response.status).toBe(403);
  });
});

describe("Chat History Access Policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows expired trial users to read chat history (GET)", async () => {
    // GET has no premium check — users can always view past conversations
    mockSupabase = createMockSupabase({
      selectData: [
        { role: "user", content: "Old question" },
        { role: "assistant", content: "Old answer" },
      ],
    });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    // getSubscriptionStatus should NOT have been called for GET (history fetch is not gated)
    expect(getSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("blocks expired trial users from sending new messages (POST)", async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(FREE_STATUS_NO_CHAT);
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await POST(mockRequest({ message: "New question" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.trialExpired).toBe(true);
  });
});
