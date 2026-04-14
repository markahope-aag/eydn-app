import { describe, it, expect } from "vitest";
import { getTrialEmail } from "./email-trial";

describe("getTrialEmail", () => {
  const baseData = {
    partner1Name: "Alice Johnson",
    trialEndsAt: "2026-05-01T00:00:00.000Z",
  };

  describe("day_10_save_card", () => {
    it("uses the 4 days left subject", () => {
      const { subject } = getTrialEmail("day_10_save_card", baseData);
      expect(subject).toBe("4 days left on your Eydn trial");
    });

    it("greets the user by first name only", () => {
      const { html } = getTrialEmail("day_10_save_card", baseData);
      expect(html).toContain("Hi Alice");
      expect(html).not.toContain("Alice Johnson");
    });

    it("includes the save-card CTA button", () => {
      const { html } = getTrialEmail("day_10_save_card", baseData);
      expect(html).toContain("Save a card");
      expect(html).toContain("/dashboard/billing");
    });

    it("includes trust-page links in the footer", () => {
      const { html } = getTrialEmail("day_10_save_card", baseData);
      expect(html).toContain("/why-we-charge-for-pro");
      expect(html).toContain("/pledge");
    });

    it("falls back to 'there' when partner name is empty", () => {
      const { html } = getTrialEmail("day_10_save_card", {
        ...baseData,
        partner1Name: "",
      });
      expect(html).toContain("Hi there");
    });
  });

  describe("day_14_renews_today", () => {
    it("uses the renews today subject", () => {
      const { subject } = getTrialEmail("day_14_renews_today", baseData);
      expect(subject).toBe("Eydn Pro renews today");
    });

    it("mentions card ending when cardLast4 is provided", () => {
      const { html } = getTrialEmail("day_14_renews_today", {
        ...baseData,
        cardLast4: "4242",
        cardBrand: "Visa",
      });
      expect(html).toContain("Visa");
      expect(html).toContain("4242");
    });

    it("falls back to generic 'card on file' when last 4 missing", () => {
      const { html } = getTrialEmail("day_14_renews_today", baseData);
      expect(html).toContain("Your card on file");
    });

    it("always says the $14.99 charge amount", () => {
      const { html } = getTrialEmail("day_14_renews_today", baseData);
      expect(html).toContain("$14.99");
    });

    it("links to billing management", () => {
      const { html } = getTrialEmail("day_14_renews_today", baseData);
      expect(html).toContain("/dashboard/billing");
    });
  });

  describe("day_14_downgraded", () => {
    it("uses the trial ended subject", () => {
      const { subject } = getTrialEmail("day_14_downgraded", baseData);
      expect(subject).toBe("Your Eydn trial ended");
    });

    it("reassures that plans are preserved", () => {
      const { html } = getTrialEmail("day_14_downgraded", baseData);
      expect(html).toContain("Your plans, tasks, guests");
      expect(html).toContain("doesn&rsquo;t go anywhere");
    });

    it("lists both Lifetime and Monthly plans", () => {
      const { html } = getTrialEmail("day_14_downgraded", baseData);
      expect(html).toContain("$14.99");
      expect(html).toContain("$79");
    });

    it("links to pricing and all three trust pages", () => {
      const { html } = getTrialEmail("day_14_downgraded", baseData);
      expect(html).toContain("/dashboard/pricing");
      expect(html).toContain("/why-we-charge-for-pro");
      expect(html).toContain("/what-free-costs");
      expect(html).toContain("/pledge");
    });
  });

  describe("brand voice", () => {
    it("none of the templates use banned exclamation-point phrases", () => {
      const types = ["day_10_save_card", "day_14_renews_today", "day_14_downgraded"] as const;
      for (const type of types) {
        const { html, subject } = getTrialEmail(type, baseData);
        const combined = subject + html;
        expect(combined).not.toMatch(/\b(Oops|Amazing|Perfect|Wonderful|Absolutely)!/);
      }
    });
  });

  describe("date formatting", () => {
    it("formats trialEndsAt as a human-readable date", () => {
      // Use noon UTC to avoid midnight rollover to the previous day
      // in local time (the formatter respects the runtime TZ).
      const { html } = getTrialEmail("day_10_save_card", {
        ...baseData,
        trialEndsAt: "2026-05-01T12:00:00.000Z",
      });
      // Format is { weekday: 'long', month: 'long', day: 'numeric' }
      expect(html).toMatch(/May 1/);
    });

    it("does not crash when the date string is garbage", () => {
      // Invalid Date doesn't throw in toLocaleDateString, it just
      // renders "Invalid Date" — the template should still produce
      // a non-empty string so the email send doesn't fail.
      const { html, subject } = getTrialEmail("day_10_save_card", {
        ...baseData,
        trialEndsAt: "not-a-date",
      });
      expect(subject).toBe("4 days left on your Eydn trial");
      expect(html.length).toBeGreaterThan(100);
    });
  });
});
