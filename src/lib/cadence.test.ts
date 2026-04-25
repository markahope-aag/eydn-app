import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cadenceSubscribe } from "./cadence";

const ORIGINAL_ENV = process.env;

describe("cadenceSubscribe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.CADENCE_URL = "https://cadence.example.com";
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("skips the fetch entirely when CADENCE_URL is unset", async () => {
    delete process.env.CADENCE_URL;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await cadenceSubscribe({ formId: "form_123", email: "a@b.com" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips the fetch when formId is an empty string", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await cadenceSubscribe({ formId: "", email: "a@b.com" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs to the subscribe endpoint with the form_id and email", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await cadenceSubscribe({ formId: "form_xyz", email: "alice@example.com" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://cadence.example.com/api/subscribe");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      form_id: "form_xyz",
      email: "alice@example.com",
      first_name: undefined,
    });
  });

  it("includes first_name when provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await cadenceSubscribe({ formId: "form_xyz", email: "a@b.com", firstName: "Alice" });

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.first_name).toBe("Alice");
  });

  it("strips a trailing slash on CADENCE_URL", async () => {
    process.env.CADENCE_URL = "https://cadence.example.com/";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await cadenceSubscribe({ formId: "form_xyz", email: "a@b.com" });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://cadence.example.com/api/subscribe");
  });

  it("returns an error result when the fetch rejects — never throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await cadenceSubscribe({ formId: "form_xyz", email: "a@b.com" });

    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.error).toContain("network down");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns an error result when the endpoint returns a non-OK status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("oops", { status: 500 })
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await cadenceSubscribe({ formId: "form_xyz", email: "a@b.com" });

    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.error).toContain("500");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns a skipped result when CADENCE_URL is unset", async () => {
    delete process.env.CADENCE_URL;
    const result = await cadenceSubscribe({ formId: "form_123", email: "a@b.com" });
    expect(result.status).toBe("skipped");
    if (result.status === "skipped") expect(result.reason).toMatch(/CADENCE_URL/);
  });

  it("returns a skipped result when formId is empty", async () => {
    const result = await cadenceSubscribe({ formId: "", email: "a@b.com" });
    expect(result.status).toBe("skipped");
    if (result.status === "skipped") expect(result.reason).toMatch(/formId/);
  });

  it("returns ok on a successful 2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    const result = await cadenceSubscribe({ formId: "form_xyz", email: "a@b.com" });
    expect(result.status).toBe("ok");
  });

  it("omits first_name from the payload when passed null", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await cadenceSubscribe({ formId: "form_xyz", email: "a@b.com", firstName: null });

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.first_name).toBeUndefined();
  });
});
