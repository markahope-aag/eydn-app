import { describe, it, expect } from "vitest";
import { getCalculatorEmail } from "./email-calculator";

describe("getCalculatorEmail", () => {
  const sampleAllocations = [
    { label: "Venue", amount: 11900, pct: 0.238 },
    { label: "Catering & bar", amount: 9600, pct: 0.192 },
    { label: "Photography & video", amount: 6000, pct: 0.12 },
  ];

  const baseParams = {
    firstName: "Alice",
    budget: 50000,
    guests: 100,
    state: "California",
    allocations: sampleAllocations,
    signInUrl: "https://clerk.dev/signin?token=abc",
    isNewUser: true,
  };

  it("formats the budget in USD in the subject", () => {
    const { subject } = getCalculatorEmail(baseParams);
    expect(subject).toContain("$50,000");
    expect(subject).toContain("wedding budget breakdown");
  });

  it("greets the user by first word of firstName", () => {
    const { html } = getCalculatorEmail({ ...baseParams, firstName: "Alice Johnson" });
    expect(html).toContain("Hi Alice,");
  });

  it("falls back to 'there' when firstName is null", () => {
    const { html } = getCalculatorEmail({ ...baseParams, firstName: null });
    expect(html).toContain("Hi there,");
  });

  it("includes the total budget, guests, state, and per-guest math", () => {
    const { html } = getCalculatorEmail(baseParams);
    expect(html).toContain("$50,000");
    expect(html).toContain("100");
    expect(html).toContain("California");
    // Per guest = 50000 / 100 = $500
    expect(html).toContain("$500");
  });

  it("renders every allocation row with label, percent, and amount", () => {
    const { html } = getCalculatorEmail(baseParams);
    expect(html).toContain("Venue");
    expect(html).toContain("24%"); // 0.238 rounded
    expect(html).toContain("$11,900");
    expect(html).toContain("Catering &amp; bar");
    expect(html).toContain("Photography &amp; video");
  });

  it("shows the sign-in CTA when signInUrl is provided", () => {
    const { html } = getCalculatorEmail(baseParams);
    expect(html).toContain("Your Eydn account is ready");
    expect(html).toContain(baseParams.signInUrl);
    expect(html).toContain("no password needed");
  });

  it("says 'Welcome back' when isNewUser is false", () => {
    const { html } = getCalculatorEmail({ ...baseParams, isNewUser: false });
    expect(html).toContain("Welcome back");
  });

  it("falls back to the generic Try-Eydn CTA when signInUrl is null", () => {
    const { html } = getCalculatorEmail({ ...baseParams, signInUrl: null });
    expect(html).not.toContain("Sign in to Eydn");
    expect(html).toContain("Try Eydn free");
    expect(html).toContain("/sign-up");
  });

  it("escapes HTML-special chars in firstName to prevent injection", () => {
    const { html } = getCalculatorEmail({
      ...baseParams,
      firstName: "<script>alert('xss')</script>",
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in the state value", () => {
    const { html } = getCalculatorEmail({ ...baseParams, state: "<b>California</b>" });
    expect(html).not.toContain("<b>California</b>");
    expect(html).toContain("&lt;b&gt;California&lt;/b&gt;");
  });
});
