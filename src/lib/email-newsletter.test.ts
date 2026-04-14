import { describe, it, expect } from "vitest";
import { getNewsletterWelcomeEmail } from "./email-newsletter";

describe("getNewsletterWelcomeEmail", () => {
  it("uses the promised subject line", () => {
    const { subject } = getNewsletterWelcomeEmail();
    expect(subject).toBe("Your wedding planning checklist");
  });

  it("includes all six planning phases", () => {
    const { html } = getNewsletterWelcomeEmail();
    expect(html).toContain("12+ months out");
    expect(html).toContain("9–11 months out");
    expect(html).toContain("6–8 months out");
    expect(html).toContain("3–5 months out");
    expect(html).toContain("1–2 months out");
    expect(html).toContain("Final week");
  });

  it("includes the Try Eydn free CTA linked to sign-up", () => {
    const { html } = getNewsletterWelcomeEmail();
    expect(html).toContain("Try Eydn free");
    expect(html).toContain("/sign-up");
  });

  it("opens with 'Welcome' — no exclamation point per brand voice", () => {
    const { html } = getNewsletterWelcomeEmail();
    expect(html).toContain("Welcome.");
    expect(html).not.toContain("Welcome!");
  });

  it("mentions the trial is free with no card required", () => {
    const { html } = getNewsletterWelcomeEmail();
    expect(html).toContain("14 days free");
    expect(html).toContain("no card required");
  });
});
