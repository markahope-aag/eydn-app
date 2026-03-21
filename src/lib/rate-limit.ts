/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per IP address.
 *
 * For production at scale, replace with Redis-based rate limiting (e.g. @upstash/ratelimit).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

/**
 * Check if a request should be rate limited.
 * Returns { limited: false } if allowed, or { limited: true, retryAfter } if blocked.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { limited: false } | { limited: true; retryAfter: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
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
} as const;
