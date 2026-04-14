import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockRestoreRecord = vi.fn();
const mockLogActivity = vi.fn();
vi.mock("@/lib/audit", () => ({
  restoreRecord: (...args: unknown[]) => mockRestoreRecord(...args),
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

import { POST } from "./route";

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/trash/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: {},
    userId: "user_123",
  });
  mockRestoreRecord.mockResolvedValue({ error: null });
});

describe("POST /api/trash/restore", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(postReq({ entityType: "guest", entityId: "g1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when entityType is missing", async () => {
    const res = await POST(postReq({ entityId: "g1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when entityId is missing", async () => {
    const res = await POST(postReq({ entityType: "guest" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when entityType is unknown", async () => {
    const res = await POST(postReq({ entityType: "hacker", entityId: "g1" }));
    expect(res.status).toBe(400);
  });

  it("restores a known entity and logs activity", async () => {
    const res = await POST(postReq({ entityType: "guest", entityId: "g1" }));
    expect(res.status).toBe(200);
    expect(mockRestoreRecord).toHaveBeenCalledWith({}, "guests", "g1", "wed_1");
    expect(mockLogActivity).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: "restore", entityId: "g1" })
    );
  });

  it("surfaces supabase errors from the restore", async () => {
    mockRestoreRecord.mockResolvedValue({ error: { message: "db down", code: "500" } });
    const res = await POST(postReq({ entityType: "task", entityId: "t1" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
