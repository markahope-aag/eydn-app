import { describe, it, expect } from "vitest";
import { pickThemeColors } from "./palette";

describe("pickThemeColors", () => {
  it("returns null with fewer than two colors", () => {
    expect(pickThemeColors([])).toBeNull();
    expect(pickThemeColors(["#2C3E2D"])).toBeNull();
  });

  it("uses the darkest color as primary and the lightest as accent", () => {
    const result = pickThemeColors(["#FFFFFF", "#000000", "#888888"]);
    expect(result).toEqual({ primary: "#000000", accent: "#FFFFFF" });
  });

  it("works regardless of input order", () => {
    const result = pickThemeColors(["#E8D5B7", "#2C3E2D", "#D4A5A5"]);
    expect(result?.primary).toBe("#2C3E2D"); // darkest
    expect(result?.accent).toBe("#E8D5B7"); // lightest
  });
});
