 
import { describe, it, expect } from "vitest";
import { BUDGET_TEMPLATE, BUDGET_CATEGORIES, BUDGET_ALLOCATIONS } from "./budget-template";

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

describe("BUDGET_ALLOCATIONS", () => {
  it("all percentage values sum to 100", () => {
    const total = Object.values(BUDGET_ALLOCATIONS).reduce((sum, pct) => sum + pct, 0);
    expect(total).toBe(100);
  });

  it("all values are positive numbers", () => {
    for (const [category, pct] of Object.entries(BUDGET_ALLOCATIONS)) {
      expect(typeof pct).toBe("number");
      expect(pct).toBeGreaterThan(0);
      // Provide a useful failure message via the condition itself
      expect(pct).toBeLessThanOrEqual(100);
      void category;
    }
  });

  it("covers the main cost categories (Ceremony & Venue, Food & Beverage, Photography & Video)", () => {
    expect(BUDGET_ALLOCATIONS["Ceremony & Venue"]).toBeDefined();
    expect(BUDGET_ALLOCATIONS["Food & Beverage"]).toBeDefined();
    expect(BUDGET_ALLOCATIONS["Photography & Video"]).toBeDefined();
  });

  it("Ceremony & Venue has the highest allocation", () => {
    const max = Math.max(...Object.values(BUDGET_ALLOCATIONS));
    expect(BUDGET_ALLOCATIONS["Ceremony & Venue"]).toBe(max);
  });

  it("every key in BUDGET_ALLOCATIONS is also a BUDGET_CATEGORY", () => {
    for (const key of Object.keys(BUDGET_ALLOCATIONS)) {
      expect(BUDGET_CATEGORIES).toContain(key);
    }
  });

  it("every BUDGET_CATEGORY has an allocation entry", () => {
    for (const category of BUDGET_CATEGORIES) {
      expect(BUDGET_ALLOCATIONS[category]).toBeDefined();
    }
  });
});
