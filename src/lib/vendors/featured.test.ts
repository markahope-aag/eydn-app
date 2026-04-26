import { describe, it, expect } from "vitest";
import { pickTopFeatured } from "./featured";

function r(id: string, quality_score: number | null, created_at: string | null = null) {
  return { id, quality_score, featured: false, created_at };
}

describe("pickTopFeatured", () => {
  it("returns empty for empty input", () => {
    expect(pickTopFeatured([])).toEqual(new Set());
  });

  it("guarantees at least one featured for any non-empty category", () => {
    // 1 vendor: 10% rounds to 0.1, ceil = 1, max(1,1) = 1
    expect(pickTopFeatured([r("a", 90)])).toEqual(new Set(["a"]));
    // 5 vendors: 10% = 0.5, ceil = 1
    expect(pickTopFeatured([r("a", 50), r("b", 60), r("c", 70), r("d", 80), r("e", 90)]).size).toBe(1);
  });

  it("picks the top N=ceil(count*0.1) by quality_score", () => {
    // 20 vendors → top 2
    const rows = Array.from({ length: 20 }, (_, i) => r(`v${i}`, i));
    const featured = pickTopFeatured(rows);
    expect(featured.size).toBe(2);
    expect(featured.has("v19")).toBe(true);
    expect(featured.has("v18")).toBe(true);
  });

  it("rounds up: 11 vendors → top 2 (not top 1)", () => {
    const rows = Array.from({ length: 11 }, (_, i) => r(`v${i}`, i));
    expect(pickTopFeatured(rows).size).toBe(2);
  });

  it("rounds up: 10 vendors → top 1", () => {
    const rows = Array.from({ length: 10 }, (_, i) => r(`v${i}`, i));
    expect(pickTopFeatured(rows).size).toBe(1);
  });

  it("sorts NULL quality_score to the bottom (only featured if no scored rows)", () => {
    const rows = [r("nul", null), r("scored", 50)];
    const featured = pickTopFeatured(rows);
    expect(featured.has("scored")).toBe(true);
    expect(featured.has("nul")).toBe(false);
  });

  it("features a NULL row when nothing else is available (the at-least-1 guarantee)", () => {
    const rows = [r("only-null", null)];
    const featured = pickTopFeatured(rows);
    expect(featured.has("only-null")).toBe(true);
  });

  it("breaks ties on score by created_at asc (older wins)", () => {
    // Both score 80; only top 1 (10 vendors). Older created_at should win.
    const rows = [
      r("newer", 80, "2026-01-02T00:00:00Z"),
      r("older", 80, "2026-01-01T00:00:00Z"),
      ...Array.from({ length: 8 }, (_, i) => r(`low${i}`, 10)),
    ];
    const featured = pickTopFeatured(rows);
    expect(featured.has("older")).toBe(true);
    expect(featured.has("newer")).toBe(false);
  });

  it("is deterministic across runs (same input → same output)", () => {
    const rows = Array.from({ length: 50 }, (_, i) => r(`v${i}`, (i * 7) % 100, `2026-01-${(i % 28) + 1}`));
    const a = pickTopFeatured(rows);
    const b = pickTopFeatured([...rows].reverse());
    expect([...a].sort()).toEqual([...b].sort());
  });
});
