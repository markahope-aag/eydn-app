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
  description_status: "ai_generated",
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

  it("passes with no street address (kept as a soft signal, not a hard block)", () => {
    const result = checkQuality({ ...passingVendor, address: null });
    expect(result.passed).toBe(true);
  });

  it("fails when both phone and website are missing", () => {
    const result = checkQuality({ ...passingVendor, phone: null, website: null });
    expect(result.passed).toBe(false);
    expect(result.failedRules).toContain("no contact method (need phone or website)");
  });

  it("passes with phone only (website missing)", () => {
    const result = checkQuality({ ...passingVendor, website: "" });
    expect(result.passed).toBe(true);
  });

  it("passes with website only (phone missing)", () => {
    const result = checkQuality({ ...passingVendor, phone: null });
    expect(result.passed).toBe(true);
  });

  it("reports every failed rule, not just the first", () => {
    const result = checkQuality({
      ...passingVendor,
      address: null,
      phone: null,
      website: null,
      quality_score: 10,
      description_status: "pending",
    });
    expect(result.passed).toBe(false);
    // 3 failures: low score + no contact method + bad description status.
    // (address is now a soft signal — no longer counted.)
    expect(result.failedRules.length).toBe(3);
  });

  it("manually_approved overrides every rule", () => {
    const result = checkQuality({
      ...passingVendor,
      manually_approved: true,
      quality_score: 0,
      address: null,
      phone: null,
      website: null,
      description_status: "pending",
    });
    expect(result.passed).toBe(true);
    expect(result.failedRules).toEqual([]);
  });

  it("fails when description_status is 'pending'", () => {
    const result = checkQuality({ ...passingVendor, description_status: "pending" });
    expect(result.passed).toBe(false);
    expect(result.failedRules.some((r) => r.includes("not finalized: pending"))).toBe(true);
  });

  it("fails when description_status is 'needs_review'", () => {
    const result = checkQuality({ ...passingVendor, description_status: "needs_review" });
    expect(result.passed).toBe(false);
    expect(result.failedRules.some((r) => r.includes("not finalized: needs_review"))).toBe(true);
  });

  it("passes when description_status is 'manually_written'", () => {
    const result = checkQuality({ ...passingVendor, description_status: "manually_written" });
    expect(result.passed).toBe(true);
  });

  it("fails when description_status is missing entirely", () => {
    const result = checkQuality({ ...passingVendor, description_status: null });
    expect(result.passed).toBe(false);
    expect(result.failedRules).toContain("description_status missing");
  });
});
