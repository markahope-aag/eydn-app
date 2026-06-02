import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks for the engine's collaborators (declared before importing SUT) ---
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/vendors/ai-categorize", () => ({
  normalizeCategoryWithAI: vi.fn(async () => ({ category: "Photographers", source: "static", reasoning: null })),
}));
vi.mock("@/lib/vendors/quality", () => ({
  checkQuality: vi.fn(() => ({ passed: true, failedRules: [] })),
}));
vi.mock("@/lib/vendors/featured", () => ({
  applyFeaturedRule: vi.fn(async () => {}),
}));

import { createClient } from "@supabase/supabase-js";
import {
  runScraperImport,
  isOperational,
  buildScraperExtras,
} from "./scraper-import";

type AnyRow = Record<string, unknown>;

function buildRow(overrides: Partial<AnyRow> = {}): AnyRow {
  return {
    id: "s1",
    name: "Bloom & Co",
    category: "wedding photographer",
    street: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "US",
    phone: "5125551234",
    website: "https://bloom.co",
    email: "hi@bloom.co",
    description: "Lovely florals",
    description_status: "ai_generated",
    eydn_score: 88,
    price_level: "2",
    market: "Austin",
    instagram: null,
    facebook: null,
    pinterest: null,
    business_status: "OPERATIONAL",
    hours: null,
    lat: 30.26,
    lng: -97.74,
    photos: [],
    google_maps_url: "https://maps.google.com/x",
    _review_count: 12,
    client_id: "c1",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

/**
 * Minimal chainable Supabase mock. Every builder method returns the same
 * builder; awaiting it (or calling maybeSingle) resolves via `resolver(state)`.
 */
function makeClient(resolver: (state: AnyRow) => { data?: unknown; error?: unknown }) {
  return {
    from(table: string) {
      const state: AnyRow = { table, op: "select", rows: null, rangeFrom: 0, single: false };
      const builder: AnyRow = {
        select: () => builder,
        order: () => builder,
        range: (f: number) => { state.rangeFrom = f; return builder; },
        not: () => builder,
        eq: () => builder,
        is: () => builder,
        insert: (rows: unknown) => { state.op = "insert"; state.rows = rows; return builder; },
        upsert: (rows: unknown) => { state.op = "upsert"; state.rows = rows; return builder; },
        maybeSingle: () => { state.single = true; return builder; },
        then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
          Promise.resolve(resolver(state)).then(onF, onR),
      };
      return builder;
    },
  };
}

type LocalConfig = {
  seen?: { suggested_vendors?: string[]; vendor_import_rejections?: string[] };
  upsert?: (state: AnyRow) => { data?: unknown; error?: unknown };
  rejectError?: { message: string } | null;
};

function makeLocal(cfg: LocalConfig = {}) {
  const rejInserts: unknown[] = [];
  const upsertCalls: unknown[] = [];
  const client = makeClient((state) => {
    const { table, op, rangeFrom, rows, single } = state as {
      table: string; op: string; rangeFrom: number; rows: unknown; single: boolean;
    };
    if (op === "select" && (table === "suggested_vendors" || table === "vendor_import_rejections")) {
      const ids = rangeFrom === 0 ? (cfg.seen?.[table as keyof typeof cfg.seen] ?? []) : [];
      return { data: ids.map((id) => ({ scraper_id: id })), error: null };
    }
    if (table === "vendor_import_rejections" && op === "insert") {
      rejInserts.push(rows);
      return { error: cfg.rejectError ?? null };
    }
    if (table === "suggested_vendors" && op === "upsert") {
      upsertCalls.push(rows);
      if (cfg.upsert) return cfg.upsert(state);
      const arr = Array.isArray(rows) ? rows : [rows];
      const data = single
        ? { name: (arr[0] as AnyRow).name }
        : arr.map((r) => ({ name: (r as AnyRow).name }));
      return { data, error: null };
    }
    return { data: [], error: null };
  });
  return { client, rejInserts, upsertCalls };
}

function makeScraper(rows: AnyRow[]) {
  return makeClient((state) => {
    if (state.table === "vendors" && state.op === "select") {
      return { data: (state.rangeFrom as number) === 0 ? rows : [], error: null };
    }
    return { data: [], error: null };
  });
}

const mockedCreateClient = vi.mocked(createClient);

describe("isOperational", () => {
  it("treats a missing status as operational", () => {
    expect(isOperational(buildRow({ business_status: null }) as never)).toBe(true);
  });
  it("treats OPERATIONAL as operational", () => {
    expect(isOperational(buildRow({ business_status: "OPERATIONAL" }) as never)).toBe(true);
  });
  it("treats CLOSED_PERMANENTLY / CLOSED_TEMPORARILY as not operational", () => {
    expect(isOperational(buildRow({ business_status: "CLOSED_PERMANENTLY" }) as never)).toBe(false);
    expect(isOperational(buildRow({ business_status: "CLOSED_TEMPORARILY" }) as never)).toBe(false);
  });
});

describe("buildScraperExtras", () => {
  it("maps scraper-only fields and elides empty ones", () => {
    const extras = buildScraperExtras(buildRow({ instagram: "@bloom", facebook: "" }) as never);
    expect(extras.instagram).toBe("@bloom");
    expect(extras.facebook).toBeUndefined();
    expect(extras.review_count).toBe(12);
    expect(extras.business_status).toBe("OPERATIONAL");
    expect("lat" in extras).toBe(false); // promoted to a column, not in extras
  });
});

describe("runScraperImport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips rows already in the seen set and inserts nothing for them", async () => {
    const { client, upsertCalls } = makeLocal({ seen: { suggested_vendors: ["s1"] } });
    mockedCreateClient.mockReturnValue(makeScraper([buildRow({ id: "s1" })]) as never);

    const result = await runScraperImport(client as never, "https://x.supabase.co", "key", "c1");

    expect(result.alreadySeen).toBe(1);
    expect(result.inserted).toBe(0);
    expect(upsertCalls).toHaveLength(0);
  });

  it("inserts a valid, unseen row", async () => {
    const { client, upsertCalls } = makeLocal();
    mockedCreateClient.mockReturnValue(makeScraper([buildRow({ id: "new1" })]) as never);

    const result = await runScraperImport(client as never, "https://x.supabase.co", "key", "c1");

    expect(result.inserted).toBe(1);
    expect(result.alreadySeen).toBe(0);
    expect(upsertCalls).toHaveLength(1);
    expect(result.insertedNames).toContain("Bloom & Co");
  });

  it("rejects a row missing required structural fields", async () => {
    const { client, rejInserts, upsertCalls } = makeLocal();
    mockedCreateClient.mockReturnValue(
      makeScraper([buildRow({ id: "bad1", name: null, city: null })]) as never
    );

    const result = await runScraperImport(client as never, "https://x.supabase.co", "key", "c1");

    expect(result.rejected).toBe(1);
    expect(result.inserted).toBe(0);
    expect(rejInserts).toHaveLength(1);
    expect(upsertCalls).toHaveLength(0);
    expect(result.rejectionSummary["missing name"]).toBe(1);
  });

  it("falls back to per-row upserts when the bulk insert errors", async () => {
    let bulkSeen = false;
    const { client } = makeLocal({
      upsert: (state) => {
        const rows = state.rows;
        if (Array.isArray(rows)) {
          bulkSeen = true;
          return { data: null, error: { message: "bulk poisoned" } };
        }
        return { data: { name: (rows as AnyRow).name }, error: null };
      },
    });
    mockedCreateClient.mockReturnValue(
      makeScraper([buildRow({ id: "a", name: "A Co" }), buildRow({ id: "b", name: "B Co" })]) as never
    );

    const result = await runScraperImport(client as never, "https://x.supabase.co", "key", "c1");

    expect(bulkSeen).toBe(true);
    // Both rows still land via the per-row fallback.
    expect(result.inserted).toBe(2);
    expect(result.errors.some((e) => e.includes("retrying row-by-row"))).toBe(true);
  });
});
