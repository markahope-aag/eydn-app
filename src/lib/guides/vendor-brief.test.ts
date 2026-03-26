import { describe, it, expect } from "vitest";
import { generateVendorBrief } from "./vendor-brief";

const baseWedding = {
  partner1: "Alice",
  partner2: "Bob",
  date: "2025-09-20",
  venue: "Grand Ballroom",
};

const emptyResponses: Record<string, unknown> = {};
const emptyCrossData: Record<string, Record<string, unknown>> = {};

describe("generateVendorBrief", () => {
  it("returns null for unknown slug", () => {
    expect(generateVendorBrief("unknown-vendor", {}, {}, baseWedding)).toBeNull();
    expect(generateVendorBrief("", {}, {}, baseWedding)).toBeNull();
  });

  // --- Florist ---

  it("generates florist brief with correct sections", () => {
    const responses = { q1: 5000, q2: "Rose Garden Florist", q14: "Roses, Peonies" };
    const result = generateVendorBrief("florist", responses, emptyCrossData, baseWedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("FLORIST BRIEF");
    expect(result!.text).toContain("Alice & Bob");
    expect(result!.text).toContain("Grand Ballroom");

    const sectionTitles = result!.sections.map((s) => s.title);
    expect(sectionTitles).toContain("Overview");
    expect(sectionTitles).toContain("Ceremony Florals");
    expect(sectionTitles).toContain("Wedding Party");
    expect(sectionTitles).toContain("Reception");
    expect(sectionTitles).toContain("Style & Preferences");
  });

  it("florist brief uses cross-data colors when available", () => {
    const crossData = { "colors-theme": { q5: "Blush and Gold" } };
    const result = generateVendorBrief("florist", {}, crossData, baseWedding);

    expect(result!.text).toContain("Blush and Gold");
  });

  it("florist brief falls back to q13 for palette when no cross-data", () => {
    const responses = { q13: "Navy and White" };
    const result = generateVendorBrief("florist", responses, emptyCrossData, baseWedding);

    expect(result!.text).toContain("Navy and White");
  });

  // --- Music ---

  it("generates music brief with correct sections", () => {
    const responses = { q1: 3000, q2: "DJ", q7: "Upbeat and fun" };
    const result = generateVendorBrief("music", responses, emptyCrossData, baseWedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("MUSIC / DJ BRIEF");
    expect(result!.text).toContain("Alice & Bob");

    const sectionTitles = result!.sections.map((s) => s.title);
    expect(sectionTitles).toContain("Overview");
    expect(sectionTitles).toContain("Ceremony Music");
    expect(sectionTitles).toContain("Reception Music");
    expect(sectionTitles).toContain("Logistics");
  });

  // --- Rentals ---

  it("generates rentals brief with correct sections", () => {
    const result = generateVendorBrief("rentals", { q2: 2000 }, emptyCrossData, baseWedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("RENTALS BRIEF");
    expect(result!.sections).toHaveLength(5);

    const sectionTitles = result!.sections.map((s) => s.title);
    expect(sectionTitles).toContain("Seating");
    expect(sectionTitles).toContain("Linens");
    expect(sectionTitles).toContain("Tabletop");
    expect(sectionTitles).toContain("Extras");
  });

  // --- Hair & Makeup ---

  it("generates hair-makeup brief with correct sections", () => {
    const result = generateVendorBrief("hair-makeup", { q4: 1500 }, emptyCrossData, baseWedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("HAIR & MAKEUP BRIEF");
    expect(result!.sections).toHaveLength(4);

    const sectionTitles = result!.sections.map((s) => s.title);
    expect(sectionTitles).toContain("Overview");
    expect(sectionTitles).toContain("Trials");
    expect(sectionTitles).toContain("Hair");
    expect(sectionTitles).toContain("Makeup");
  });

  // --- Decor ---

  it("generates decor brief with correct sections", () => {
    const result = generateVendorBrief("decor", { q1: 4000 }, emptyCrossData, baseWedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("DECOR BRIEF");

    const sectionTitles = result!.sections.map((s) => s.title);
    expect(sectionTitles).toContain("Overview");
    expect(sectionTitles).toContain("Ceremony Decor");
    expect(sectionTitles).toContain("Reception");
    expect(sectionTitles).toContain("Style");
  });

  // --- Missing/empty responses ---

  it("handles missing responses gracefully with fallback values", () => {
    const result = generateVendorBrief("florist", emptyResponses, emptyCrossData, baseWedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("Not specified");
  });

  it("handles null wedding date gracefully", () => {
    const wedding = { ...baseWedding, date: null };
    const result = generateVendorBrief("florist", {}, emptyCrossData, wedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("TBD");
  });

  it("handles null venue gracefully", () => {
    const wedding = { ...baseWedding, venue: null };
    const result = generateVendorBrief("florist", {}, emptyCrossData, wedding);

    expect(result).not.toBeNull();
    expect(result!.text).toContain("Venue: TBD");
  });

  it("formats date as human-readable string", () => {
    const result = generateVendorBrief("music", {}, emptyCrossData, baseWedding);
    // "2025-09-20" should be formatted as "September 20, 2025"
    expect(result!.text).toContain("September 20, 2025");
  });

  it("handles array response values by joining them", () => {
    const responses = { q14: ["Roses", "Peonies", "Dahlias"] };
    const result = generateVendorBrief("florist", responses, emptyCrossData, baseWedding);

    expect(result!.text).toContain("Roses, Peonies, Dahlias");
  });

  it("handles empty array as Not specified", () => {
    const responses = { q14: [] };
    const result = generateVendorBrief("florist", responses, emptyCrossData, baseWedding);

    expect(result!.text).toContain("Not specified");
  });
});
