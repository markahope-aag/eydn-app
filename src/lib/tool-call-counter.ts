/**
 * Per-user monthly tool-call counter for chat cap enforcement.
 *
 * Free tier users have a limited number of tool calls per calendar month.
 * Trial, Pro, Beta, and Admin tiers are unlimited — no counter is touched
 * for them. Counter is keyed by userId + YYYY-MM, uses Upstash Redis via
 * INCR with a 40-day TTL (comfortably covers the next month rollover).
 * Falls back to an in-memory map when Redis is not configured.
 *
 * See project_pricing_model.md + project_trial_economics.md for the
 * rationale: capping tool calls (not messages) aligns the meter with
 * actual Claude inference cost because the agentic loop can iterate
 * up to MAX_TOOL_ITERATIONS per user message.
 */

import { Redis } from "@upstash/redis";
import { AI } from "@/lib/config";
import type { Tier } from "@/lib/subscription";

const TTL_SECONDS = 40 * 24 * 60 * 60; // 40 days

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = null;
    return null;
  }
  redisClient = Redis.fromEnv();
  return redisClient;
}

function currentMonthKey(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function redisKey(userId: string, month: string): string {
  return `toolcalls:${userId}:${month}`;
}

// In-memory fallback (dev / when Redis is unavailable).
const memoryStore = new Map<string, number>();

/**
 * Get the current tool-call count for this user in the current month.
 * Returns 0 if no calls have been made yet.
 */
export async function getToolCallCount(userId: string): Promise<number> {
  const key = redisKey(userId, currentMonthKey());
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get<number>(key);
      return val ?? 0;
    } catch {
      // Fall through to memory on Redis failure.
    }
  }
  return memoryStore.get(key) ?? 0;
}

/**
 * Increment the tool-call counter for this user and return the new total.
 * Sets TTL on first increment of the month so the key auto-expires.
 */
export async function incrementToolCallCount(userId: string): Promise<number> {
  const key = redisKey(userId, currentMonthKey());
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.incr(key);
      if (val === 1) {
        // First call of the month — set TTL so the key expires.
        await redis.expire(key, TTL_SECONDS);
      }
      return val;
    } catch {
      // Fall through to memory on Redis failure.
    }
  }
  const next = (memoryStore.get(key) ?? 0) + 1;
  memoryStore.set(key, next);
  return next;
}

export type ToolCallMeter = {
  /** Calls used this period. */
  used: number;
  /** Hard cap, or null if unlimited. */
  limit: number | null;
  /** Calls still available, or null if unlimited. */
  remaining: number | null;
};

/**
 * Compute the meter state for a given tier. Only the free tier has a cap;
 * every other tier returns { limit: null, remaining: null } (unlimited)
 * and skips the Redis read entirely.
 */
export async function getToolCallMeter(userId: string, tier: Tier): Promise<ToolCallMeter> {
  if (tier !== "free") {
    return { used: 0, limit: null, remaining: null };
  }
  const used = await getToolCallCount(userId);
  const limit = AI.FREE_TIER_TOOL_CALL_LIMIT;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/** For tests only — wipe the in-memory store. */
export function __resetToolCallMemory() {
  memoryStore.clear();
  redisClient = undefined;
}
