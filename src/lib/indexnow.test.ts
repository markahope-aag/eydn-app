import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { submitToIndexNow } from "./indexnow";

describe("submitToIndexNow", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns ok:true immediately for empty URL array", async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const result = await submitToIndexNow([]);

    expect(result).toEqual({ ok: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("submits absolute URLs to IndexNow API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch;

    const result = await submitToIndexNow(["https://eydn.app/blog/my-post"]);

    expect(result).toEqual({ ok: true, status: 200 });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.indexnow.org/indexnow");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.host).toBe("eydn.app");
    expect(body.urlList).toEqual(["https://eydn.app/blog/my-post"]);
  });

  it("prepends site URL to relative paths", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch;

    await submitToIndexNow(["/blog/new-post", "/about"]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urlList).toEqual([
      "https://eydn.app/blog/new-post",
      "https://eydn.app/about",
    ]);
  });

  it("handles mixed absolute and relative URLs", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch;

    await submitToIndexNow(["https://eydn.app/existing", "/new-page"]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urlList).toEqual([
      "https://eydn.app/existing",
      "https://eydn.app/new-page",
    ]);
  });

  it("returns ok:false with status on API error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 422 });
    globalThis.fetch = mockFetch;

    const result = await submitToIndexNow(["/blog/post"]);

    expect(result).toEqual({ ok: false, status: 422 });
  });

  it("returns ok:false when fetch throws a network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    globalThis.fetch = mockFetch;

    const result = await submitToIndexNow(["/blog/post"]);

    expect(result).toEqual({ ok: false });
  });

  it("includes the IndexNow key in the request body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch;

    await submitToIndexNow(["/test"]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.key).toBe("4384f82587380e15c9605d2bca060c6e");
    expect(body.keyLocation).toContain("4384f82587380e15c9605d2bca060c6e.txt");
  });

  it("sends correct Content-Type header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch;

    await submitToIndexNow(["/test"]);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("application/json; charset=utf-8");
  });
});
