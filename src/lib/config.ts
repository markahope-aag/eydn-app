/** Centralized configuration constants. Import from here instead of hardcoding. */

// ── AI / Claude ─────────────────────────────────────────────────
export const AI = {
  MODEL: "claude-sonnet-4-20250514",
  MAX_TOKENS: 1024,
  MAX_TOOL_ITERATIONS: 5,
  MAX_MESSAGE_LENGTH: 10_000,
  SEARCH_DAILY_LIMIT: 10,
  // Free tier tool-call cap per calendar month. Pro/trial/beta/admin
  // tiers are unlimited. Tune after launch based on conversion data.
  FREE_TIER_TOOL_CALL_LIMIT: 10,
} as const;

// ── File Uploads ────────────────────────────────────────────────
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] as const,
  ALLOWED_DOCUMENT_TYPES: [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff", "image/heic", "image/heif", "image/svg+xml", "image/avif",
    "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "text/plain",
  ] as const,
} as const;

// ── Cache TTLs (milliseconds) ───────────────────────────────────
export const CACHE_TTL = {
  AUTH_WEDDING: 60_000,           // 1 minute
  WEB_SEARCH: 24 * 60 * 60 * 1000, // 24 hours
  VENDOR_ENRICHMENT_DAYS: 7,      // days before re-enriching
} as const;

// ── Pagination ──────────────────────────────────────────────────
export const PAGE_SIZE = {
  DEFAULT: 25,
  CHAT_HISTORY: 50,
  ACTIVITY_LOG: 50,
  NOTIFICATIONS: 20,
  ADMIN_USERS: 100,
  VENDOR_IMPORT: 5000,
  BATCH_INSERT: 50,
} as const;

// ── Lifecycle Thresholds (months after wedding) ─────────────────
export const LIFECYCLE = {
  POST_WEDDING_MONTHS: 12,
  ARCHIVE_MONTHS: 24,
  EMAILS: {
    POST_WEDDING_WELCOME: 0,
    DOWNLOAD_REMINDER_1MO: 1,
    DOWNLOAD_REMINDER_6MO: 6,
    DOWNLOAD_REMINDER_9MO: 9,
    MEMORY_PLAN_OFFER: 11,
    ARCHIVE_NOTICE: 12,
    SUNSET_WARNING: 21,
    SUNSET_FINAL: 23.5,
  },
} as const;

// ── Time Windows (days) ─────────────────────────────────────────
export const TIME_WINDOWS = {
  DEADLINE_REMINDER_DAYS: 7,
  CHAT_CONTEXT_DAYS: 14,
  VENDOR_REMINDER_DEDUP_DAYS: 7,
  ANALYTICS_SHORT_DAYS: 7,
  ANALYTICS_MEDIUM_DAYS: 30,
  ANALYTICS_LONG_DAYS: 90,
  STORAGE_CLEANUP_HOURS: 24,
} as const;

// ── Chat Context Display Limits ─────────────────────────────────
export const CHAT_CONTEXT = {
  GUIDE_RESPONSES: 8,
  OVERDUE_TASKS_PREVIEW: 5,
  DUE_SOON_TASKS_PREVIEW: 5,
  INCOMPLETE_TASKS_LIST: 20,
  GUEST_LIST_PREVIEW: 40,
  TEXT_TRUNCATE_LONG: 80,
  TEXT_TRUNCATE_SHORT: 60,
  BLOG_EXCERPT_LENGTH: 80,
} as const;
