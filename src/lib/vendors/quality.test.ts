import { describe, it, expect } from "vitest";
import { checkQuality, QUALITY_RULES, type VendorCandidate } from "./quality";

const passingVendor: VendorCandidate = {
  name: "Test Florist",
  category: "Florist",
  address: "123 Main St",
  city: "Austin",
  state: "TX",
  phone: "+15125551234",
  website: "https://example.com",
  quality_score: 75,
};

describe("checkQuality", () => {
  it("passes a vendor that meets all rules", () => {
    const result = checkQuality(passingVendor);
    expect(result.passed).toBe(true);
    expect(result.failedRules).toEqual([]);
  });

  it("fails when score is null", () => {
    const result = checkQuality({ ...passingVendor, quality_score: null });
    expect(result.passed).toBe(false);
    expect(result.failedRules.some((r) => r.includes("missing quality_score"))).toBe(true);
  });

  it("fails when score is below the threshold", () => {
    const result = checkQuality({ ...passingVendor, quality_score: QUALITY_RULES.minScore - 1 });
    expect(result.passed).toBe(false);
    expect(result.failedRules.some((r) => r.includes("below threshold"))).toBe(true);
  });

  it("passes at exactly the threshold", () => {
    const result = checkQuality({ ...passingVendor, quality_score: QUALITY_RULES.minScore });
    expect(result.passed).toBe(true);
  });

  it("fails when address is null", () => {
    const result = checkQuality({ ...passingVendor, address: null });
    expect(result.passed).toBe(false);
    expect(result.failedRules).toContain("missing street address");
  });

  it("fails when address is just whitespace", () => {
    const result = checkQuality({ ...passingVendor, address: "   " });
    expect(result.passed).toBe(false);
    expect(result.failedRules).toContain("missing street address");
  });

  it("fails when phone is missing", () => {
    const result = checkQuality({ ...passingVendor, phone: null });
    expect(result.passed).toBe(false);
    expect(result.failedRules).toContain("missing phone");
  });

  it("fails when website is missing", () => {
    const result = checkQuality({ ...passingVendor, website: "" });
    expect(result.passed).toBe(false);
    expect(result.failedRules).toContain("missing website");
  });

  it("reports every failed rule, not just the first", () => {
    const result = checkQuality({
      ...passingVendor,
      address: null,
      phone: null,
      website: null,
      quality_score: 10,
    });
    expect(result.passed).toBe(false);
    // 4 failures: low score + missing address + phone + website.
    expect(result.failedRules.length).toBe(4);
  });

  it("manually_approved overrides every rule", () => {
    const result = checkQuality({
      ...passingVendor,
      manually_approved: true,
      quality_score: 0,
      address: null,
      phone: null,
      website: null,
    });
    expect(result.passed).toBe(true);
    expect(result.failedRules).toEqual([]);
  });
});
