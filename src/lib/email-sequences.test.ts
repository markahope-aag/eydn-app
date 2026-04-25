import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  getDueSteps,
  matchesAudience,
  pickFooter,
  type SequenceStep,
} from "./email-sequences";

describe("renderTemplate", () => {
  it("substitutes a single variable", () => {
    expect(renderTemplate("Hi {{name}}", { name: "Alex" })).toBe("Hi Alex");
  });

  it("substitutes multiple variables in one pass", () => {
    expect(renderTemplate("{{a}}-{{b}}-{{a}}", { a: "X", b: "Y" })).toBe("X-Y-X");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderTemplate("Hello {{ name }}!", { name: "Sam" })).toBe("Hello Sam!");
  });

  it("renders missing variables as empty string", () => {
    expect(renderTemplate("a={{missing}}b", {})).toBe("a=b");
  });

  it("renders null/undefined as empty string but allows zero", () => {
    expect(renderTemplate("a={{x}}", { x: null })).toBe("a=");
    expect(renderTemplate("a={{x}}", { x: undefined })).toBe("a=");
    expect(renderTemplate("a={{x}}", { x: 0 })).toBe("a=0");
  });

  it("ignores invalid placeholder syntax", () => {
    expect(renderTemplate("a={{ no-dashes }}b", { "no-dashes": "X" })).toBe("a={{ no-dashes }}b");
  });

  it("does not double-evaluate substituted values", () => {
    // If a value happens to look like a placeholder, it should NOT be re-substituted.
    expect(renderTemplate("{{a}}", { a: "{{b}}", b: "danger" })).toBe("{{b}}");
  });
});

describe("matchesAudience", () => {
  it("matches when every filter key equals the attr value", () => {
    expect(matchesAudience({ paid: true }, { paid: true, other: 1 })).toBe(true);
  });

  it("rejects when any filter key differs", () => {
    expect(matchesAudience({ paid: true }, { paid: false })).toBe(false);
  });

  it("rejects when a filter key is missing from attrs", () => {
    expect(matchesAudience({ paid: true }, {})).toBe(false);
  });

  it("matches everything when filter is empty", () => {
    expect(matchesAudience({}, { anything: "goes" })).toBe(true);
  });
});

describe("getDueSteps", () => {
  const anchor = new Date("2026-04-01T00:00:00Z");
  const baseStep = (over: Partial<SequenceStep>): SequenceStep => ({
    step_order: 1,
    template_slug: "t",
    offset_days: 0,
    audience_filter: {},
    enabled: true,
    ...over,
  });

  it("returns only steps whose offset has elapsed", () => {
    const now = new Date("2026-04-15T00:00:00Z"); // 14 days after anchor
    const due = getDueSteps(
      [
        baseStep({ step_order: 1, offset_days: 7 }),
        baseStep({ step_order: 2, offset_days: 14 }),
        baseStep({ step_order: 3, offset_days: 21 }),
      ],
      anchor,
      new Set(),
      now
    );
    expect(due.map((s) => s.step_order)).toEqual([1, 2]);
  });

  it("excludes steps already in the sent set", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const due = getDueSteps(
      [baseStep({ step_order: 1, offset_days: 5 }), baseStep({ step_order: 2, offset_days: 10 })],
      anchor,
      new Set([1]),
      now
    );
    expect(due.map((s) => s.step_order)).toEqual([2]);
  });

  it("excludes disabled steps", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const due = getDueSteps(
      [
        baseStep({ step_order: 1, offset_days: 5, enabled: false }),
        baseStep({ step_order: 2, offset_days: 5 }),
      ],
      anchor,
      new Set(),
      now
    );
    expect(due.map((s) => s.step_order)).toEqual([2]);
  });

  it("returns nothing when anchor is in the future", () => {
    const now = new Date("2026-03-01T00:00:00Z"); // before anchor
    const due = getDueSteps([baseStep({ offset_days: 0 })], anchor, new Set(), now);
    expect(due).toEqual([]);
  });

  it("sorts results by step_order ascending", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    const due = getDueSteps(
      [
        baseStep({ step_order: 5, offset_days: 1 }),
        baseStep({ step_order: 1, offset_days: 1 }),
        baseStep({ step_order: 3, offset_days: 1 }),
      ],
      anchor,
      new Set(),
      now
    );
    expect(due.map((s) => s.step_order)).toEqual([1, 3, 5]);
  });
});

describe("pickFooter", () => {
  it("returns the unsubscribe footer for marketing with a token", () => {
    const f = pickFooter("marketing", "tok123");
    expect(f).toContain("Unsubscribe");
    expect(f).toContain("tok123");
  });

  it("returns the default footer for marketing without a token", () => {
    const f = pickFooter("marketing", undefined);
    expect(f).toContain("2921 Landmark Place");
    expect(f).not.toContain("Unsubscribe");
  });

  it("returns the default footer for transactional regardless of token", () => {
    expect(pickFooter("transactional", "tok123")).not.toContain("Unsubscribe");
  });

  it("returns the default footer for lifecycle (account-state) regardless of token", () => {
    expect(pickFooter("lifecycle", "tok123")).not.toContain("Unsubscribe");
  });

  it("treats nurture like marketing for unsubscribe rules", () => {
    expect(pickFooter("nurture", "tok123")).toContain("Unsubscribe");
  });
});
