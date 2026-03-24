import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Rate limit configs ──────────────────────────────────────────────────────

type RLConfig = { limit: number; window: string };

const RL_PUBLIC: RLConfig = { limit: 20, window: "60 s" };
const RL_CHAT: RLConfig = { limit: 10, window: "60 s" };
const RL_AUTH: RLConfig = { limit: 15, window: "60 s" };
const RL_API: RLConfig = { limit: 60, window: "60 s" };

/** Map path prefixes to rate limit configs (checked in order, first match wins) */
const ROUTE_LIMITS: [string, RLConfig][] = [
  ["/api/public/", RL_PUBLIC],
  ["/api/chat", RL_CHAT],
  ["/api/subscribe", RL_AUTH],
  ["/api/onboarding", RL_AUTH],
  ["/api/admin/setup", RL_AUTH],
  ["/api/vendor-portal/checkout", RL_AUTH],
  ["/api/", RL_API],
];

// ─── Lazy-init rate limiters ─────────────────────────────────────────────────

const limiters = new Map<string, Ratelimit>();

function getLimiter(config: RLConfig): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const key = `${config.limit}:${config.window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.limit, config.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
      analytics: true,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// ─── In-memory fallback for local dev ────────────────────────────────────────

const memStore = new Map<string, { count: number; resetAt: number }>();

function checkMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export default clerkMiddleware(async (_auth, request) => {
  const path = request.nextUrl.pathname;

  // Only rate-limit API routes
  if (!path.startsWith("/api/")) return;

  // Skip webhooks (Stripe sends retries on 429)
  if (path.startsWith("/api/webhooks/")) return;

  // Skip cron jobs (authenticated by CRON_SECRET, not user IP)
  if (path.startsWith("/api/cron/")) return;

  // Find matching rate limit config
  const match = ROUTE_LIMITS.find(([prefix]) => path.startsWith(prefix));
  if (!match) return;

  const [, config] = match;
  const ip = getClientIP(request);
  const rlKey = `rl:${ip}:${config.limit}`;

  const limiter = getLimiter(config);

  if (limiter) {
    try {
      const result = await limiter.limit(rlKey);
      if (!result.success) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
      return;
    } catch {
      // Redis failure — fall through to memory
    }
  }

  // In-memory fallback
  const windowMs = parseInt(config.window) * 1000;
  if (checkMemory(rlKey, config.limit, windowMs)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
