 
import { describe, it, expect } from "vitest";
import { BUDGET_TEMPLATE, BUDGET_CATEGORIES } from "./budget-template";

describe("BUDGET_TEMPLATE integrity", () => {
  it("has a reasonable number of items", () => {
    expect(BUDGET_TEMPLATE.length).toBeGreaterThanOrEqual(20);
  });

  it("all items have category and description", () => {
    for (const item of BUDGET_TEMPLATE) {
      expect(typeof item.category).toBe("string");
      expect(item.category.length).toBeGreaterThan(0);
      expect(typeof item.description).toBe("string");
      expect(item.description.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate descriptions within the same category", () => {
    const seen = new Map<string, Set<string>>();
    for (const item of BUDGET_TEMPLATE) {
      if (!seen.has(item.category)) {
        seen.set(item.category, new Set());
      }
      const descSet = seen.get(item.category)!;
      expect(descSet.has(item.description)).toBe(false);
      descSet.add(item.description);
    }
  });

  it("BUDGET_CATEGORIES matches unique categories from template", () => {
    const uniqueFromTemplate = [...new Set(BUDGET_TEMPLATE.map((i) => i.category))];
    expect(BUDGET_CATEGORIES).toEqual(uniqueFromTemplate);
  });

  it("all categories are non-empty strings", () => {
    for (const cat of BUDGET_CATEGORIES) {
      expect(typeof cat).toBe("string");
      expect(cat.trim().length).toBeGreaterThan(0);
    }
  });

  it("honeymoon category items exist", () => {
    const honeymoonItems = BUDGET_TEMPLATE.filter((i) => i.category === "Honeymoon");
    expect(honeymoonItems.length).toBeGreaterThanOrEqual(1);

    const descriptions = honeymoonItems.map((i) => i.description);
    expect(descriptions).toContain("Flights");
    expect(descriptions).toContain("Hotels");
  });
});
