import { describe, it, expect, beforeEach, vi } from "vitest";

// Force the Redis path off so the counter uses its in-memory fallback.
// This keeps the test hermetic and exercises the same logic that would
// run in a local dev environment without Upstash configured.
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

import {
  getToolCallCount,
  incrementToolCallCount,
  getToolCallMeter,
  __resetToolCallMemory,
} from "./tool-call-counter";
import { AI } from "@/lib/config";

beforeEach(() => {
  __resetToolCallMemory();
});

describe("tool-call-counter", () => {
  it("getToolCallCount returns 0 for a user with no activity", async () => {
    expect(await getToolCallCount("user_new")).toBe(0);
  });

  it("incrementToolCallCount increases the count for a user", async () => {
    expect(await incrementToolCallCount("user_a")).toBe(1);
    expect(await incrementToolCallCount("user_a")).toBe(2);
    expect(await incrementToolCallCount("user_a")).toBe(3);
    expect(await getToolCallCount("user_a")).toBe(3);
  });

  it("counts are isolated per user", async () => {
    await incrementToolCallCount("user_a");
    await incrementToolCallCount("user_a");
    await incrementToolCallCount("user_b");

    expect(await getToolCallCount("user_a")).toBe(2);
    expect(await getToolCallCount("user_b")).toBe(1);
  });

  it("getToolCallMeter returns unlimited (null) for non-free tiers", async () => {
    await incrementToolCallCount("user_trial");
    await incrementToolCallCount("user_trial");

    // Non-free tiers should not even read the counter — limit/remaining null.
    for (const tier of ["trialing", "pro", "beta", "admin"] as const) {
      const meter = await getToolCallMeter("user_trial", tier);
      expect(meter.limit).toBeNull();
      expect(meter.remaining).toBeNull();
    }
  });

  it("getToolCallMeter returns used/limit/remaining for free tier", async () => {
    await incrementToolCallCount("user_free");
    await incrementToolCallCount("user_free");
    await incrementToolCallCount("user_free");

    const meter = await getToolCallMeter("user_free", "free");
    expect(meter.used).toBe(3);
    expect(meter.limit).toBe(AI.FREE_TIER_TOOL_CALL_LIMIT);
    expect(meter.remaining).toBe(AI.FREE_TIER_TOOL_CALL_LIMIT - 3);
  });

  it("remaining clamps to 0 when used exceeds the limit", async () => {
    for (let i = 0; i < AI.FREE_TIER_TOOL_CALL_LIMIT + 5; i++) {
      await incrementToolCallCount("user_over");
    }
    const meter = await getToolCallMeter("user_over", "free");
    expect(meter.used).toBe(AI.FREE_TIER_TOOL_CALL_LIMIT + 5);
    expect(meter.remaining).toBe(0);
  });
});
