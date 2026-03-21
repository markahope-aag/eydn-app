/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- Mocks ---

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function createMockSupabase(overrides: {
  selectData?: unknown[];
  insertData?: unknown;
  insertError?: { message: string } | null;
  uploadError?: { message: string } | null;
  entityLookup?: unknown;
} = {}) {
  const {
    selectData = [],
    insertData = { id: "att-1", file_name: "photo.jpg" },
    insertError = null,
    uploadError = null,
    entityLookup = { id: "entity-1" },
  } = overrides;

  return {
    from: vi.fn((table: string) => {
      if (table === "tasks" || table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({ data: entityLookup })),
              })),
            })),
          })),
        };
      }
      // attachments table
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({ data: selectData, error: null })),
              })),
              order: vi.fn(() => ({ data: selectData, error: null })),
            })),
            order: vi.fn(() => ({ data: selectData, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: insertData, error: insertError })),
          })),
        })),
      };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ error: uploadError })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://storage.example.com/photo.jpg" },
        })),
      })),
    },
  };
}

let mockSupabase = createMockSupabase();

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  requirePremium: vi.fn(),
}));

import { getWeddingForUser } from "@/lib/auth";
import { requirePremium } from "@/lib/subscription";
import { GET, POST } from "./route";

// --- Helpers ---

function mockFormDataRequest(fields: Record<string, string | File>): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new Request("http://localhost/api/attachments", {
    method: "POST",
    body: formData,
  });
}

function createMockFile(name = "photo.jpg", type = "image/jpeg", size = 1024): File {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

function mockAuthSuccess() {
  mockSupabase = createMockSupabase();
  vi.mocked(getWeddingForUser).mockResolvedValue({
    wedding: mockWedding as any,
    supabase: mockSupabase as any,
    userId: "user-1",
    role: "owner",
  });
}

// --- Tests ---

describe("GET /api/attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSuccess();
    vi.mocked(requirePremium).mockResolvedValue(null);
  });

  it("returns attachment list", async () => {
    const attachments = [{ id: "a1", file_name: "photo.jpg" }];
    mockSupabase = createMockSupabase({ selectData: attachments });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const request = new Request("http://localhost/api/attachments");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(attachments);
  });
});

describe("POST /api/attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSuccess();
    vi.mocked(requirePremium).mockResolvedValue(null);
  });

  it("skips premium check for synthetic ID website-cover", async () => {
    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "website-cover",
    });

    await POST(request);

    expect(requirePremium).not.toHaveBeenCalled();
  });

  it("skips premium check for synthetic ID mood-board", async () => {
    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "mood-board",
    });

    await POST(request);

    expect(requirePremium).not.toHaveBeenCalled();
  });

  it("skips entity verification for synthetic IDs", async () => {
    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "website-cover",
    });

    const response = await POST(request);

    // Should succeed without trying to look up the entity in DB
    expect(response.status).toBe(201);
  });

  it("returns 403 for real entity IDs when premium check fails", async () => {
    vi.mocked(requirePremium).mockResolvedValue(
      NextResponse.json({ error: "Premium required" }, { status: 403 })
    );

    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "real-task-uuid",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/premium/i);
  });

  it("requires premium for real entity IDs", async () => {
    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "some-real-task-id",
    });

    await POST(request);

    expect(requirePremium).toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const request = mockFormDataRequest({
      entity_type: "task",
      entity_id: "website-cover",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/missing required/i);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "website-cover",
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 404 when real task entity is not found", async () => {
    mockSupabase = createMockSupabase({ entityLookup: null });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "nonexistent-task-uuid",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/task not found/i);
  });

  it("returns 404 when real vendor entity is not found", async () => {
    mockSupabase = createMockSupabase({ entityLookup: null });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "vendor",
      entity_id: "nonexistent-vendor-uuid",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/vendor not found/i);
  });

  it("allows upload when real task entity exists", async () => {
    mockSupabase = createMockSupabase({ entityLookup: { id: "real-task-1" } });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "real-task-1",
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("skips premium check for website-couple-photo synthetic ID", async () => {
    const file = createMockFile();
    const request = mockFormDataRequest({
      file,
      entity_type: "task",
      entity_id: "website-couple-photo",
    });

    await POST(request);

    expect(requirePremium).not.toHaveBeenCalled();
  });
});
