import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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

// ── Upstream fetch handling ──────────────────────────────────────────────────
// These exercise the Google fetch path, which the top-level GET import can't
// reach (its API_KEY was captured as "" at load). We stub the env var and
// re-import the route module so it picks up a configured key, then mock fetch.

describe("GET /api/places-photo — upstream fetch handling", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Set the key BEFORE the dynamic import below so route.ts captures it at
    // module load. Direct process.env assignment (vi.stubEnv isn't available
    // in this Vitest setup).
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    mockAuth.mockResolvedValue({ userId: "user-1" });
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GOOGLE_PLACES_API_KEY;
    } else {
      process.env.GOOGLE_PLACES_API_KEY = originalKey;
    }
    global.fetch = originalFetch;
  });

  async function loadGet() {
    const mod = await import("./route");
    return mod.GET;
  }

  function imageResponse(): Response {
    return new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
  }

  it("passes image bytes through with the upstream content type", async () => {
    fetchMock.mockResolvedValue(imageResponse());
    const get = await loadGet();

    const res = await get(mockRequest("places/abc/photos/xyz"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toMatch(/max-age=86400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when Google answers a non-image body with a 200", async () => {
    // Missing/expired photos sometimes come back as a 200 JSON error.
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "not found" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const get = await loadGet();

    const res = await get(mockRequest("places/abc/photos/stale"));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });

  it("retries once on a transient 429 and then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(imageResponse());
    const get = await loadGet();

    const res = await get(mockRequest("places/abc/photos/xyz"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails fast (no retry) on a non-transient upstream error", async () => {
    fetchMock.mockResolvedValue(new Response("forbidden", { status: 403 }));
    const get = await loadGet();

    const res = await get(mockRequest("places/abc/photos/xyz"));

    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 after exhausting retries on persistent transient errors", async () => {
    fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));
    const get = await loadGet();

    const res = await get(mockRequest("places/abc/photos/xyz"));

    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when the fetch throws (network error / timeout)", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    const get = await loadGet();

    const res = await get(mockRequest("places/abc/photos/xyz"));

    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
