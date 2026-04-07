import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// --- Mocks ---

const mockFrom = vi.fn();
const mockSubmitToIndexNow = vi.fn();
const mockLogCronExecution = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/indexnow", () => ({
  submitToIndexNow: (...args: unknown[]) => mockSubmitToIndexNow(...args),
}));

vi.mock("@/lib/cron-logger", () => ({
  logCronExecution: (...args: unknown[]) => mockLogCronExecution(...args),
}));

import { GET } from "./route";

function mockRequest(bearer?: string): Request {
  const headers: Record<string, string> = {};
  if (bearer) {
    headers.authorization = `Bearer ${bearer}`;
  }
  return new Request("http://localhost/api/cron/indexnow", { headers });
}

describe("GET /api/cron/indexnow", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: "test-secret" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns 401 when no authorization header", async () => {
    const res = await GET(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when bearer token is wrong", async () => {
    const res = await GET(mockRequest("wrong-secret"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(mockRequest("test-secret"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("submits URLs and returns success when authorized", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ slug: "my-blog-post" }, { slug: "another-post" }],
          error: null,
        }),
      }),
    });
    mockSubmitToIndexNow.mockResolvedValue({ ok: true, status: 200 });
    mockLogCronExecution.mockResolvedValue(undefined);

    const res = await GET(mockRequest("test-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.urlCount).toBeGreaterThan(0);
    // Should include static + blog URLs
    expect(mockSubmitToIndexNow).toHaveBeenCalledWith(
      expect.arrayContaining(["/", "/blog", "/blog/my-blog-post", "/blog/another-post"]),
    );
  });

  it("logs success when IndexNow returns ok", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    mockSubmitToIndexNow.mockResolvedValue({ ok: true, status: 200 });
    mockLogCronExecution.mockResolvedValue(undefined);

    await GET(mockRequest("test-secret"));

    expect(mockLogCronExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "indexnow",
        status: "success",
      }),
    );
  });

  it("logs error when IndexNow returns non-ok status", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    mockSubmitToIndexNow.mockResolvedValue({ ok: false, status: 429 });
    mockLogCronExecution.mockResolvedValue(undefined);

    const res = await GET(mockRequest("test-secret"));
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(json.status).toBe(429);
    expect(mockLogCronExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "indexnow",
        status: "error",
      }),
    );
  });

  it("handles no blog posts gracefully", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    mockSubmitToIndexNow.mockResolvedValue({ ok: true, status: 200 });
    mockLogCronExecution.mockResolvedValue(undefined);

    const res = await GET(mockRequest("test-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    // Should still have static URLs
    expect(json.urlCount).toBeGreaterThan(0);
  });

  it("returns 500 and logs error when exception is thrown", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error("DB connection failed")),
      }),
    });
    mockLogCronExecution.mockResolvedValue(undefined);

    const res = await GET(mockRequest("test-secret"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB connection failed");
    expect(mockLogCronExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "indexnow",
        status: "error",
        errorMessage: "DB connection failed",
      }),
    );
  });
});
