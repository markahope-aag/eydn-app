import { AI } from "@/lib/config";

/**
 * Every Claude model the app calls in production. The `model-health` cron
 * verifies each one still resolves against the Anthropic models API and warns
 * ahead of any known retirement.
 *
 * KEEP THIS IN SYNC when you adopt a new model anywhere in the app — the live
 * 404 check is only as complete as this list.
 *
 * Current usage:
 *  - AI.MODEL → chat, budget optimizer, task personalizer, catch-up generator
 *  - Haiku 4.5 → vendor categorization (lib/vendors/ai-categorize.ts)
 */
export const MODELS_IN_USE: readonly string[] = [
  AI.MODEL,
  "claude-haiku-4-5-20251001",
];

/**
 * Published Anthropic retirement dates (ISO yyyy-mm-dd) for models we use.
 * Anthropic announces these months ahead when a model is deprecated; add an
 * entry when you adopt a model so the cron can warn ~30 days before the date.
 * The models API does NOT expose these dates, so this map is maintained by hand.
 *
 * Example: "claude-sonnet-4-6": "2027-01-01"
 */
export const MODEL_RETIREMENT_DATES: Readonly<Record<string, string>> = {};
