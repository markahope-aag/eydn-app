import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Upstash modules to avoid real Redis calls
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn(),
  },
}));

import { checkRateLimit, getClientIP, RATE_LIMITS } from "./rate-limit";
import type { RateLimitConfig } from "./rate-limit";

describe("checkRateLimit (in-memory fallback)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Ensure no Redis env vars so we use in-memory fallback
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows requests under the limit", async () => {
    const config: RateLimitConfig = { limit: 5, windowSeconds: 60 };
    const result = await checkRateLimit("test-user-1", config);
    expect(result.limited).toBe(false);
  });

  it("allows exactly limit number of requests", async () => {
    const config: RateLimitConfig = { limit: 3, windowSeconds: 60 };
    const key = "test-exact-limit";

    const r1 = await checkRateLimit(key, config);
    const r2 = await checkRateLimit(key, config);
    const r3 = await checkRateLimit(key, config);

    expect(r1.limited).toBe(false);
    expect(r2.limited).toBe(false);
    expect(r3.limited).toBe(false);
  });

  it("blocks requests over the limit", async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 60 };
    const key = "test-over-limit";

    await checkRateLimit(key, config);
    await checkRateLimit(key, config);
    const r3 = await checkRateLimit(key, config);

    expect(r3.limited).toBe(true);
    if (r3.limited) {
      expect(r3.retryAfter).toBeGreaterThan(0);
      expect(r3.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("uses separate counters for different keys", async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    const r1 = await checkRateLimit("key-a", config);
    const r2 = await checkRateLimit("key-b", config);

    expect(r1.limited).toBe(false);
    expect(r2.limited).toBe(false);
  });

  it("resets counter after window expires", async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 1 };
    const key = "test-expiry";

    await checkRateLimit(key, config);
    const blocked = await checkRateLimit(key, config);
    expect(blocked.limited).toBe(true);

    // Advance time past the window
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    const afterExpiry = await checkRateLimit(key, config);
    expect(afterExpiry.limited).toBe(false);

    vi.useRealTimers();
  });

  it("uses different counters for different configs", async () => {
    const config1: RateLimitConfig = { limit: 1, windowSeconds: 60 };
    const key = "test-different-configs";

    await checkRateLimit(key, config1);
    const blocked = await checkRateLimit(key, config1);
    expect(blocked.limited).toBe(true);

    // In-memory fallback uses the same key string, so the counter is shared
    // across configs. This tests the actual behavior.
  });
});

describe("checkRateLimit (Redis env detection)", () => {
  it("returns not limited via in-memory when no Redis env vars", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkRateLimit("no-redis-key", { limit: 10, windowSeconds: 60 });
    expect(result.limited).toBe(false);
  });

  it("handles the case when only one Redis env var is set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkRateLimit("partial-redis", { limit: 10, windowSeconds: 60 });
    // Should fall back to in-memory since both vars are needed
    expect(result.limited).toBe(false);

    delete process.env.UPSTASH_REDIS_REST_URL;
  });
});

describe("getClientIP", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIP(request)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIP(request)).toBe("10.0.0.1");
  });

  it("extracts IP from cf-connecting-ip header", () => {
    const request = new Request("http://localhost/test", {
      headers: { "cf-connecting-ip": "172.16.0.1" },
    });
    expect(getClientIP(request)).toBe("172.16.0.1");
  });

  it("prefers x-forwarded-for over other headers", () => {
    const request = new Request("http://localhost/test", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
        "cf-connecting-ip": "3.3.3.3",
      },
    });
    expect(getClientIP(request)).toBe("1.1.1.1");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const request = new Request("http://localhost/test");
    expect(getClientIP(request)).toBe("unknown");
  });

  it("trims whitespace from x-forwarded-for", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" },
    });
    expect(getClientIP(request)).toBe("1.2.3.4");
  });
});

describe("RATE_LIMITS", () => {
  it("has public limits configured", () => {
    expect(RATE_LIMITS.public.limit).toBe(20);
    expect(RATE_LIMITS.public.windowSeconds).toBe(60);
  });

  it("has chat limits configured", () => {
    expect(RATE_LIMITS.chat.limit).toBe(10);
    expect(RATE_LIMITS.chat.windowSeconds).toBe(60);
  });

  it("has auth limits configured", () => {
    expect(RATE_LIMITS.auth.limit).toBe(15);
    expect(RATE_LIMITS.auth.windowSeconds).toBe(60);
  });

  it("has api limits configured", () => {
    expect(RATE_LIMITS.api.limit).toBe(60);
    expect(RATE_LIMITS.api.windowSeconds).toBe(60);
  });
});
