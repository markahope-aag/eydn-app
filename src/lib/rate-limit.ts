/**
 * Rate limiter using Upstash Redis for serverless environments.
 * Falls back to in-memory if UPSTASH_REDIS_REST_URL is not configured.
 *
 * Env vars:
 *   UPSTASH_REDIS_REST_URL   — Upstash Redis REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN — Upstash Redis REST token
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

// Lazy-init Redis-backed rate limiters (one per config)
const limiters = new Map<string, Ratelimit>();

function getRedisLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const cacheKey = `${config.limit}:${config.windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      analytics: true,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// In-memory fallback for local development
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkMemoryLimit(
  key: string,
  config: RateLimitConfig
): { limited: false } | { limited: true; retryAfter: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { limited: false };
  }

  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  entry.count++;
  return { limited: false };
}

/**
 * Check if a request should be rate limited.
 * Uses Upstash Redis if configured, falls back to in-memory.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ limited: false } | { limited: true; retryAfter: number }> {
  const redisLimiter = getRedisLimiter(config);

  if (redisLimiter) {
    try {
      const result = await redisLimiter.limit(key);
      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        return { limited: true, retryAfter: Math.max(1, retryAfter) };
      }
      return { limited: false };
    } catch {
      // Redis failure — fall through to memory
    }
  }

  return checkMemoryLimit(key, config);
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Pre-configured rate limits for different endpoint types */
export const RATE_LIMITS = {
  /** Public endpoints (RSVP, photo upload): 20 req / 60s per IP */
  public: { limit: 20, windowSeconds: 60 } as RateLimitConfig,
  /** AI chat: 10 req / 60s per IP */
  chat: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Auth-sensitive (login, onboarding): 15 req / 60s per IP */
  auth: { limit: 15, windowSeconds: 60 } as RateLimitConfig,
  /** General API: 60 req / 60s per IP */
  api: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Account-creating flows keyed by normalized email: 3 req / hour.
   *  Used alongside the per-IP bucket on the calculator handoff to
   *  prevent an attacker from burning Clerk's user quota across a
   *  rotating IP pool by submitting thousands of distinct emails. */
  accountCreationByEmail: { limit: 3, windowSeconds: 60 * 60 } as RateLimitConfig,
} as const;
