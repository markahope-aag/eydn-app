import { describe, it, expect } from "vitest";
import { estimateClaudeCostUsd } from "./analytics-server";

describe("estimateClaudeCostUsd", () => {
  it("returns 0 for zero tokens", () => {
    expect(estimateClaudeCostUsd(0, 0)).toBe(0);
  });

  it("applies the Sonnet input rate ($3 per million tokens)", () => {
    // 1M input tokens, 0 output → $3.00
    expect(estimateClaudeCostUsd(1_000_000, 0)).toBe(3);
  });

  it("applies the Sonnet output rate ($15 per million tokens)", () => {
    // 0 input, 1M output → $15.00
    expect(estimateClaudeCostUsd(0, 1_000_000)).toBe(15);
  });

  it("sums input and output cost", () => {
    // 500k input + 200k output = 1.50 + 3.00 = 4.50
    expect(estimateClaudeCostUsd(500_000, 200_000)).toBe(4.5);
  });

  it("rounds to 4 decimal places", () => {
    // 1 input token = 0.000003, rounds to 0
    expect(estimateClaudeCostUsd(1, 0)).toBe(0);
    // 1000 input tokens = 0.003 → stays
    expect(estimateClaudeCostUsd(1000, 0)).toBe(0.003);
  });

  it("handles large token counts without precision loss", () => {
    // 10M input + 2M output → 30 + 30 = 60
    expect(estimateClaudeCostUsd(10_000_000, 2_000_000)).toBe(60);
  });

  it("is a pure function with no side effects", () => {
    const first = estimateClaudeCostUsd(1000, 500);
    const second = estimateClaudeCostUsd(1000, 500);
    expect(first).toBe(second);
  });
});
