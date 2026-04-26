import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mapPriceLevel, getDailyCap } from "./places-seeder";

describe("mapPriceLevel", () => {
  it("maps Google price levels to Eydn $-tier vocabulary", () => {
    expect(mapPriceLevel("PRICE_LEVEL_INEXPENSIVE")).toBe("$");
    expect(mapPriceLevel("PRICE_LEVEL_MODERATE")).toBe("$$");
    expect(mapPriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe("$$$");
    expect(mapPriceLevel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe("$$$$");
  });

  it("returns null for unknown levels rather than fabricating a tier", () => {
    expect(mapPriceLevel("PRICE_LEVEL_FREE")).toBeNull();
    expect(mapPriceLevel("UNKNOWN")).toBeNull();
    expect(mapPriceLevel("")).toBeNull();
  });

  it("returns null for missing values", () => {
    expect(mapPriceLevel(null)).toBeNull();
    expect(mapPriceLevel(undefined)).toBeNull();
  });
});

describe("getDailyCap", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns the default of 200 when PLACES_API_DAILY_CAP is unset", () => {
    delete process.env.PLACES_API_DAILY_CAP;
    expect(getDailyCap()).toBe(200);
  });

  it("returns the configured cap when env var is a positive integer", () => {
    process.env.PLACES_API_DAILY_CAP = "500";
    expect(getDailyCap()).toBe(500);
  });

  it("falls back to default when env var is non-numeric", () => {
    process.env.PLACES_API_DAILY_CAP = "not a number";
    expect(getDailyCap()).toBe(200);
  });

  it("falls back to default when env var is zero or negative", () => {
    process.env.PLACES_API_DAILY_CAP = "0";
    expect(getDailyCap()).toBe(200);
    process.env.PLACES_API_DAILY_CAP = "-50";
    expect(getDailyCap()).toBe(200);
  });
});
