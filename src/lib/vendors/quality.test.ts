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

// As of 2026-05-05 the scraper is the source of truth for quality. The three
// optional rules in QUALITY_RULES are all disabled by default — checkQuality
// only fails on hard structural issues plus any rule an admin re-enables.
describe("checkQuality (rules disabled — scraper is the gate)", () => {
  it("passes a fully-populated vendor", () => {
    const result = checkQuality(passingVendor);
    expect(result.passed).toBe(true);
    expect(result.failedRules).toEqual([]);
  });

  it("passes when quality_score is null (rule disabled)", () => {
    const result = checkQuality({ ...passingVendor, quality_score: null });
    expect(result.passed).toBe(true);
  });

  it("passes when quality_score is far below the historical threshold", () => {
    const result = checkQuality({ ...passingVendor, quality_score: 5 });
    expect(result.passed).toBe(true);
  });

  it("passes when both phone and website are missing (rule disabled)", () => {
    const result = checkQuality({ ...passingVendor, phone: null, website: null });
    expect(result.passed).toBe(true);
  });

  it("passes when description_status is 'pending' (rule disabled)", () => {
    const result = checkQuality({ ...passingVendor, description_status: "pending" });
    expect(result.passed).toBe(true);
  });

  it("passes when description_status is 'needs_review' (rule disabled)", () => {
    const result = checkQuality({ ...passingVendor, description_status: "needs_review" });
    expect(result.passed).toBe(true);
  });

  it("passes when description_status is missing entirely", () => {
    const result = checkQuality({ ...passingVendor, description_status: null });
    expect(result.passed).toBe(true);
  });

  it("manually_approved still overrides every rule", () => {
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

  it("QUALITY_RULES exports the disabled defaults", () => {
    expect(QUALITY_RULES.minScore).toBe(0);
    expect(QUALITY_RULES.requireContactMethod).toBe(false);
    expect(QUALITY_RULES.requireFinishedDescription).toBe(false);
  });
});
