import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeCategoryWithAI } from "./ai-categorize";

// Capture what Anthropic was asked.
const messagesCreate = vi.fn();
vi.mock("@/lib/ai/claude-client", () => ({
  getClaudeClient: () => ({ messages: { create: messagesCreate } }),
}));

type Cached = {
  mapped_category: string | null;
  override_category: string | null;
  confidence: number | null;
  reasoning: string | null;
} | null;

function makeSupabase(opts: { cached?: Cached; insertSpy?: ReturnType<typeof vi.fn> } = {}) {
  const insertSpy = opts.insertSpy ?? vi.fn().mockResolvedValue({ error: null });
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: opts.cached ?? null }),
        }),
      }),
      insert: insertSpy,
    }),
  } as unknown as Parameters<typeof normalizeCategoryWithAI>[1];
}

beforeEach(() => {
  messagesCreate.mockReset();
});

describe("normalizeCategoryWithAI", () => {
  it("static-resolves a known canonical name without hitting cache or AI", async () => {
    const sb = makeSupabase();
    const result = await normalizeCategoryWithAI("Photographer", sb);
    expect(result).toEqual({ category: "Photographer", source: "static", confidence: null, reasoning: null });
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("static-resolves a known alias without hitting cache or AI", async () => {
    const sb = makeSupabase();
    const result = await normalizeCategoryWithAI("bridal shop", sb);
    expect(result.category).toBe("Attire");
    expect(result.source).toBe("static");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("returns null for empty input without any DB or AI call", async () => {
    const sb = makeSupabase();
    const insertSpy = vi.fn();
    const sb2 = makeSupabase({ insertSpy });
    expect((await normalizeCategoryWithAI("", sb)).category).toBeNull();
    expect((await normalizeCategoryWithAI("   ", sb2)).category).toBeNull();
    expect(messagesCreate).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("uses the DB cache and skips the AI call on a previously-seen unknown string", async () => {
    const sb = makeSupabase({
      cached: { mapped_category: "Caterer", override_category: null, confidence: 0.85, reasoning: "bartending is bar/beverage; nearest canonical is Caterer in legacy data" },
    });
    const result = await normalizeCategoryWithAI("never-seen-bar-thing", sb);
    expect(result.category).toBe("Caterer");
    expect(result.source).toBe("cache");
    expect(result.confidence).toBe(0.85);
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("honors override_category over mapped_category in cache hits", async () => {
    const sb = makeSupabase({
      cached: { mapped_category: "Caterer", override_category: "Bar Service", confidence: 0.85, reasoning: "ai picked caterer, admin overrode" },
    });
    const result = await normalizeCategoryWithAI("never-seen-bar-thing", sb);
    expect(result.category).toBe("Bar Service");
    expect(result.source).toBe("cache");
  });

  it("calls AI on cache miss and persists the result", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"category": "Bar Service", "confidence": 0.92, "reasoning": "mobile mixology is bar service"}' }],
    });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const sb = makeSupabase({ insertSpy });

    // String that is intentionally NOT in static aliases nor partial-matchable
    // against any canonical name — forces the cache→AI path.
    const result = await normalizeCategoryWithAI("artisan mixology experience", sb);
    expect(result.category).toBe("Bar Service");
    expect(result.source).toBe("ai");
    expect(result.confidence).toBe(0.92);

    expect(messagesCreate).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      raw_category: "artisan mixology experience",
      mapped_category: "Bar Service",
      confidence: 0.92,
    });
  });

  it("rejects (category=null) and still caches when AI confidence is below 0.5", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"category": "Caterer", "confidence": 0.3, "reasoning": "weak match"}' }],
    });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const sb = makeSupabase({ insertSpy });

    const result = await normalizeCategoryWithAI("mystery business type", sb);
    expect(result.category).toBeNull();
    expect(result.confidence).toBe(0.3);

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      raw_category: "mystery business type",
      mapped_category: null,
    });
  });

  it("rejects when AI returns null (not a wedding vendor) and caches it", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"category": null, "confidence": 0.95, "reasoning": "auto repair shop is not a wedding vendor"}' }],
    });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const sb = makeSupabase({ insertSpy });

    const result = await normalizeCategoryWithAI("auto repair shop", sb);
    expect(result.category).toBeNull();
    expect(result.source).toBe("ai");
    expect(insertSpy.mock.calls[0][0].mapped_category).toBeNull();
  });

  it("rejects when AI hallucinates a category not in VENDOR_CATEGORIES", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"category": "Skydiving Instructor", "confidence": 0.9, "reasoning": "made up"}' }],
    });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const sb = makeSupabase({ insertSpy });

    const result = await normalizeCategoryWithAI("paragliding adventure", sb);
    expect(result.category).toBeNull();
    // Hallucination still cached so we don't pay to ask again.
    expect(insertSpy.mock.calls[0][0].mapped_category).toBeNull();
  });

  it("strips code fences from AI output before parsing", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '```json\n{"category": "Florist", "confidence": 0.9, "reasoning": "matches"}\n```' }],
    });
    const sb = makeSupabase();
    const result = await normalizeCategoryWithAI("flower arrangements specialist", sb);
    expect(result.category).toBe("Florist");
  });

  it("rejects gracefully when AI returns unparseable text", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "I think it's probably a florist, definitely." }],
    });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const sb = makeSupabase({ insertSpy });
    const result = await normalizeCategoryWithAI("weird new business", sb);
    expect(result.category).toBeNull();
    expect(result.reasoning).toMatch(/parse failed/);
  });
});
