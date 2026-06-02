import { describe, it, expect } from "vitest";
import {
  getQuickStartSteps,
  isQuickStartComplete,
  nextQuickStartStep,
  type QuickStartState,
} from "./quick-start";

const EMPTY: QuickStartState = {
  hasDate: false,
  hasBudget: false,
  guestCount: 0,
  vendorCount: 0,
  doneTasks: 0,
};

describe("getQuickStartSteps", () => {
  it("returns five ordered steps, all incomplete for a brand-new account", () => {
    const steps = getQuickStartSteps(EMPTY);
    expect(steps.map((s) => s.key)).toEqual([
      "date",
      "budget",
      "guests",
      "vendors",
      "tasks",
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("marks a step done once its underlying state is satisfied", () => {
    const steps = getQuickStartSteps({
      ...EMPTY,
      hasDate: true,
      guestCount: 3,
    });
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s.done]));
    expect(byKey.date).toBe(true);
    expect(byKey.guests).toBe(true);
    expect(byKey.budget).toBe(false);
  });
});

describe("nextQuickStartStep", () => {
  it("points to the first incomplete step in order", () => {
    const steps = getQuickStartSteps({ ...EMPTY, hasDate: true });
    expect(nextQuickStartStep(steps)?.key).toBe("budget");
  });

  it("returns null when everything is done", () => {
    const steps = getQuickStartSteps({
      hasDate: true,
      hasBudget: true,
      guestCount: 5,
      vendorCount: 1,
      doneTasks: 2,
    });
    expect(nextQuickStartStep(steps)).toBeNull();
    expect(isQuickStartComplete(steps)).toBe(true);
  });
});
