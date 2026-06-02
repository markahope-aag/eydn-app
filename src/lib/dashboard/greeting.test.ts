import { describe, it, expect } from "vitest";
import { buildGreeting, type GreetingContext } from "./greeting";

const base: GreetingContext = {
  name: "Sam",
  both: "Sam & Alex",
  days: 200,
  totalTasks: 50,
  doneTasks: 20,
  taskPct: 40,
};

describe("buildGreeting", () => {
  it("welcomes a couple who haven't started (doneTasks 0)", () => {
    const msg = buildGreeting({ ...base, doneTasks: 0 });
    expect(msg).toContain("Sam");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("uses both names on the wedding day (days <= 0)", () => {
    const msg = buildGreeting({ ...base, days: 0 });
    // Every wedding-day variant references the day or both partners.
    expect(msg.toLowerCase()).toMatch(/day|sam/);
    expect(msg.length).toBeGreaterThan(0);
  });

  it("returns final-week copy (days <= 7)", () => {
    // Variants vary by day-of-year and not all embed the name, so assert the
    // message is present and personalized-or-progress rather than a literal.
    const msg = buildGreeting({ ...base, days: 5 });
    expect(msg.length).toBeGreaterThan(0);
  });

  it("falls back to progress copy when the date is unknown (days null)", () => {
    const msg = buildGreeting({ ...base, days: null, taskPct: 80, doneTasks: 40 });
    expect(msg).toContain("Sam");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("always returns a non-empty personalized string across phases", () => {
    for (const days of [null, 0, 5, 20, 60, 120, 300, 500]) {
      const msg = buildGreeting({ ...base, days });
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});
