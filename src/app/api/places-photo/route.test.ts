import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mock Clerk auth ---

const mockAuth = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "./route";

function mockRequest(ref?: string): Request {
  const url = ref
    ? `http://localhost/api/places-photo?ref=${encodeURIComponent(ref)}`
    : "http://localhost/api/places-photo";
  return new Request(url);
}

describe("GET /api/places-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await GET(mockRequest("places/abc/photos/xyz"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 400 when ref parameter is missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const res = await GET(mockRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid photo reference/i);
  });

  it("returns 400 when ref does not start with places/", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const res = await GET(mockRequest("invalid/ref"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid photo reference/i);
  });

  it("returns 400 when ref is empty string", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const res = await GET(mockRequest(""));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid photo reference/i);
  });

  it("returns 500 when GOOGLE_PLACES_API_KEY is not configured", async () => {
    // The API_KEY is captured at module load as "" since env var isn't set in test
    mockAuth.mockResolvedValue({ userId: "user-1" });

    const res = await GET(mockRequest("places/abc/photos/xyz"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/not configured/i);
  });
});
