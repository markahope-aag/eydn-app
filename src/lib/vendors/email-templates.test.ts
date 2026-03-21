 
import { describe, it, expect } from "vitest";
import { VENDOR_EMAIL_TEMPLATES } from "./email-templates";

describe("VENDOR_EMAIL_TEMPLATES", () => {
  it("all templates have category, subject, and body", () => {
    for (const tpl of VENDOR_EMAIL_TEMPLATES) {
      expect(typeof tpl.category).toBe("string");
      expect(tpl.category.length).toBeGreaterThan(0);
      expect(typeof tpl.subject).toBe("string");
      expect(tpl.subject.length).toBeGreaterThan(0);
      expect(typeof tpl.body).toBe("string");
      expect(tpl.body.length).toBeGreaterThan(0);
    }
  });

  it("subject lines contain placeholder markers", () => {
    for (const tpl of VENDOR_EMAIL_TEMPLATES) {
      // Every subject should have at least one bracketed placeholder
      expect(tpl.subject).toMatch(/\[.+?\]/);
    }
  });

  it("body text is non-empty and reasonable length", () => {
    for (const tpl of VENDOR_EMAIL_TEMPLATES) {
      // Bodies should be at least 50 chars (a real message)
      expect(tpl.body.length).toBeGreaterThanOrEqual(50);
      // And not absurdly long (under 5000 chars)
      expect(tpl.body.length).toBeLessThan(5000);
    }
  });

  it("follow-up template exists", () => {
    const followUp = VENDOR_EMAIL_TEMPLATES.find((t) => t.category === "Follow-Up");
    expect(followUp).toBeDefined();
    expect(followUp!.subject).toContain("Following Up");
  });

  it("categories cover the major vendor types", () => {
    const categories = VENDOR_EMAIL_TEMPLATES.map((t) => t.category);
    expect(categories).toContain("Photographer");
    expect(categories).toContain("Caterer");
    expect(categories).toContain("Videographer");
    expect(categories).toContain("Florist");
    expect(categories).toContain("DJ or Band");
  });

  it("has no duplicate categories except Follow-Up", () => {
    const nonFollowUp = VENDOR_EMAIL_TEMPLATES.filter(
      (t) => t.category !== "Follow-Up"
    );
    const categories = nonFollowUp.map((t) => t.category);
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);
  });

  it("body text contains placeholder markers", () => {
    for (const tpl of VENDOR_EMAIL_TEMPLATES) {
      // Each body should have at least one bracketed placeholder
      expect(tpl.body).toMatch(/\[.+?\]/);
    }
  });
});
