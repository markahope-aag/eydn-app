import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({ from: mockFrom }),
}));

const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockCadence = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cadence", () => ({
  cadenceSubscribe: (...args: unknown[]) => mockCadence(...args),
}));

const mockCapture = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analytics-server", () => ({
  captureServer: (...args: unknown[]) => mockCapture(...args),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false });
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/tools/quiz-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
});

// ─── POST /api/tools/quiz-complete ────────────────────────────────

describe("POST /api/tools/quiz-complete", () => {
  it("rejects an unknown quiz_id", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "not_a_quiz",
        email: "a@b.com",
        first_name: "Alice",
        result_key: "SC",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown quiz/);
  });

  it("rejects missing email", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        first_name: "Alice",
        result_key: "SC",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("rejects invalid email", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "not-an-email",
        first_name: "Alice",
        result_key: "SC",
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing first name", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "a@b.com",
        result_key: "SC",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/First name/);
  });

  it("rejects missing result_key", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "a@b.com",
        first_name: "Alice",
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a result_key that isn't in the quiz's results map", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "a@b.com",
        first_name: "Alice",
        result_key: "NOT_AN_ARCHETYPE",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown result/);
  });

  it("accepts a valid planning_style submission, inserts, and fires side effects", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "Alice@Example.com  ",
        first_name: "  Alice  ",
        result_key: "SC",
        answers: ["SC", "SC", "SC", "SC"],
      })
    );

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    // Supabase insert was called with normalized email and first name
    expect(mockFrom).toHaveBeenCalledWith("quiz_completions");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        quiz_id: "planning_style",
        email: "alice@example.com",
        first_name: "Alice",
        result_key: "SC",
      })
    );

    // Side effects fired
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockCadence).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com", firstName: "Alice" })
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "alice@example.com",
      "quiz_completed",
      expect.objectContaining({ quiz_id: "planning_style", result_key: "SC" })
    );
  });

  it("accepts a valid planner_assessment submission with a score", async () => {
    const res = await POST(
      jsonRequest({
        quiz_id: "planner_assessment",
        email: "bob@example.com",
        first_name: "Bob",
        result_key: "medium",
        score: 12,
      })
    );

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        quiz_id: "planner_assessment",
        result_key: "medium",
        score: 12,
      })
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "bob@example.com",
      "quiz_completed",
      expect.objectContaining({ quiz_id: "planner_assessment", score: 12 })
    );
  });

  it("ignores score on a planning_style quiz (archetype has no numeric score)", async () => {
    await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "a@b.com",
        first_name: "Alice",
        result_key: "SC",
        score: 99,
      })
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ score: null })
    );
  });

  it("still returns success when the Supabase insert errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValueOnce({ error: { message: "connection refused" } });

    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "a@b.com",
        first_name: "Alice",
        result_key: "DO",
      })
    );

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith("[QUIZ]", "connection refused");
    // Email still fires even when the DB insert failed
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, retryAfter: 60 });

    const res = await POST(
      jsonRequest({
        quiz_id: "planning_style",
        email: "a@b.com",
        first_name: "Alice",
        result_key: "SC",
      })
    );

    expect(res.status).toBe(429);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
