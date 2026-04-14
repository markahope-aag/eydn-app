import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAttachments = vi.fn();
const mockMoodBoard = vi.fn();
const mockPhotos = vi.fn();
const mockStorageList = vi.fn();
const mockStorageRemove = vi.fn();

function tableChain(result: () => unknown): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.then = (resolve: (v: unknown) => void) => resolve(result());
  return c;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "attachments") return tableChain(() => mockAttachments());
      if (table === "mood_board_items") return tableChain(() => mockMoodBoard());
      return tableChain(() => mockPhotos());
    }),
    storage: {
      from: vi.fn(() => ({
        list: (...args: unknown[]) => mockStorageList(...args),
        remove: (...args: unknown[]) => mockStorageRemove(...args),
      })),
    },
  }),
}));

const mockLogCron = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cron-logger", () => ({
  logCronExecution: (...args: unknown[]) => mockLogCron(...args),
}));

import { POST } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/storage-cleanup", { method: "POST", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  mockAttachments.mockReturnValue({ data: [], error: null });
  mockMoodBoard.mockReturnValue({ data: [], error: null });
  mockPhotos.mockReturnValue({ data: [], error: null });
  mockStorageList.mockResolvedValue({ data: [], error: null });
  mockStorageRemove.mockResolvedValue({ error: null });
});

describe("POST /api/cron/storage-cleanup", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns a successful envelope when storage is empty", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      filesScanned: 0,
      orphansDeleted: 0,
      errors: 0,
    });
  });

  it("returns 500 when the attachments query errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAttachments.mockReturnValue({ data: null, error: { message: "db down" } });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the storage list errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockStorageList.mockResolvedValue({ data: null, error: { message: "storage down" } });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });
});
