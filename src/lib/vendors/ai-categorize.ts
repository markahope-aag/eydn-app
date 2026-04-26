/**
 * AI fallback for category normalization.
 *
 * Three-tier resolution used by the import pipeline:
 *   1. Static normalize  (sync, free)  — exact + alias match
 *   2. DB cache lookup    (1 read, free) — prior AI decision for this raw string
 *   3. Claude Haiku call  (~$0.0006)     — only on first sighting, persisted
 *
 * Each unique raw category string costs at most one API call across the
 * entire history of the system. The cache is keyed on the lowercased
 * trimmed string so "Bridal Shop", "BRIDAL SHOP", and "bridal shop  " all
 * collapse to one entry.
 *
 * mapped_category=null means the AI decided the input is not a wedding
 * vendor (e.g. "auto repair shop"). The caller should treat that the
 * same as "no canonical category" and route the row to rejections.
 *
 * Admin can set override_category in category_ai_mappings to force a
 * different mapping than the AI chose; we honor that on every lookup.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getClaudeClient } from "@/lib/ai/claude-client";
import { VENDOR_CATEGORIES } from "./categories";
import { normalizeCategory } from "./normalize";

type AdminSupabase = SupabaseClient<Database>;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 200;
const MIN_CONFIDENCE = 0.5;

export type CategorizeResult = {
  category: string | null;
  source: "static" | "cache" | "ai";
  confidence: number | null;
  reasoning: string | null;
};

/**
 * Resolve a raw scraper category string to a canonical VENDOR_CATEGORIES
 * value, falling back through static aliases → DB cache → AI.
 *
 * Returns category=null when the input cannot be confidently mapped to
 * any canonical bucket — caller should reject the row.
 */
export async function normalizeCategoryWithAI(
  raw: string,
  supabase: AdminSupabase
): Promise<CategorizeResult> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { category: null, source: "static", confidence: null, reasoning: null };
  }

  // Tier 1: static normalize.
  const staticMatch = normalizeCategory(trimmed);
  if (staticMatch) {
    return { category: staticMatch, source: "static", confidence: null, reasoning: null };
  }

  const cacheKey = trimmed.toLowerCase();

  // Tier 2: DB cache.
  const { data: cached } = await supabase
    .from("category_ai_mappings")
    .select("mapped_category, override_category, confidence, reasoning")
    .eq("raw_category", cacheKey)
    .maybeSingle();

  if (cached) {
    const resolved = cached.override_category || cached.mapped_category;
    return {
      category: resolved,
      source: "cache",
      confidence: cached.confidence,
      reasoning: cached.reasoning,
    };
  }

  // Tier 3: AI call.
  const aiResult = await callClaudeForCategory(trimmed);

  // Persist for future imports — even null results, so we don't keep paying
  // to ask "is auto repair shop a wedding vendor?" over and over.
  await supabase.from("category_ai_mappings").insert({
    raw_category: cacheKey,
    mapped_category: aiResult.category,
    confidence: aiResult.confidence,
    reasoning: aiResult.reasoning,
    ai_model: MODEL,
  });

  return { ...aiResult, source: "ai" };
}

/** The Claude call. Strict JSON output, low max_tokens, no tools. */
async function callClaudeForCategory(rawCategory: string): Promise<{
  category: string | null;
  confidence: number | null;
  reasoning: string | null;
}> {
  const client = getClaudeClient();
  const canonicalList = VENDOR_CATEGORIES.map((c) => `- ${c}`).join("\n");

  const systemPrompt =
    "You categorize vendor businesses for a wedding planning app. Given a raw " +
    "category string from a third-party data source, pick the best match from " +
    "the canonical category list, or return null if the input is not a wedding " +
    "vendor (e.g. \"auto repair shop\", \"dentist\", \"grocery store\").\n\n" +
    "Output strict JSON with this shape and nothing else:\n" +
    "{\"category\": <one of the canonical names or null>, \"confidence\": <0.0-1.0>, \"reasoning\": <one short sentence>}\n\n" +
    "Confidence below 0.5 means we should reject the row. Use null category " +
    "for inputs that don't fit any wedding vendor type at all.\n\n" +
    "Canonical categories (use the exact spelling):\n" +
    canonicalList;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: `Raw category: "${rawCategory}"` }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  let parsed: { category?: unknown; confidence?: unknown; reasoning?: unknown };
  try {
    // Models occasionally wrap JSON in code fences; strip them defensively.
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    parsed = JSON.parse(cleaned);
  } catch {
    return { category: null, confidence: 0, reasoning: `parse failed: ${text.slice(0, 100)}` };
  }

  const rawCategoryOut = typeof parsed.category === "string" ? parsed.category : null;
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : null;

  // Validate the AI returned a value from our canonical list. If it
  // hallucinated a category not in VENDOR_CATEGORIES, treat as no match.
  const canonical = rawCategoryOut && (VENDOR_CATEGORIES as readonly string[]).includes(rawCategoryOut)
    ? rawCategoryOut
    : null;

  // Below threshold OR not in canonical → null.
  if (!canonical || (confidence !== null && confidence < MIN_CONFIDENCE)) {
    return { category: null, confidence, reasoning };
  }

  return { category: canonical, confidence, reasoning };
}
