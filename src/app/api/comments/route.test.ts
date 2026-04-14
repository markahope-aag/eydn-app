import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockOrder = vi.fn();
const mockInsertSingle = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: mockOrder,
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle,
        })),
      })),
    })),
  };
}

const mockGetUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    }),
}));

import { GET, POST } from "./route";

function getReq(params: string = ""): Request {
  return new Request(`http://localhost/api/comments${params}`, { method: "GET" });
}

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
    userId: "user_123",
  });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockInsertSingle.mockResolvedValue({ data: { id: "c1" }, error: null });
  mockGetUser.mockResolvedValue({
    firstName: "Alice",
    lastName: "Liddell",
    emailAddresses: [{ emailAddress: "a@b.com" }],
  });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/comments", () => {
  it("forwards auth-layer errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 when entity_type is missing", async () => {
    const res = await GET(getReq("?entity_id=x"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when entity_id is missing", async () => {
    const res = await GET(getReq("?entity_type=task"));
    expect(res.status).toBe(400);
  });

  it("returns comments when both params provided", async () => {
    mockOrder.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    const res = await GET(getReq("?entity_type=task&entity_id=t1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/comments", () => {
  it("forwards auth-layer errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(postReq({ entity_type: "task", entity_id: "t1", content: "hi" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when a required field is missing", async () => {
    const res = await POST(postReq({ entity_type: "task", entity_id: "t1" }));
    expect(res.status).toBe(400);
  });

  it("inserts a comment and returns 201", async () => {
    const res = await POST(
      postReq({ entity_type: "task", entity_id: "t1", content: "  looks good  " })
    );
    expect(res.status).toBe(201);
  });

  it("falls back to 'Unknown' when Clerk lookup throws", async () => {
    mockGetUser.mockRejectedValue(new Error("clerk down"));
    const res = await POST(
      postReq({ entity_type: "task", entity_id: "t1", content: "test" })
    );
    // Still succeeds — lookup failure is swallowed
    expect(res.status).toBe(201);
  });
});
