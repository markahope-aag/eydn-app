import { describe, it, expect } from "vitest";
import { emailWrap, defaultFooter, emailButton, emailHeading, emailTheme } from "./email-theme";

describe("emailTheme tokens", () => {
  it("uses canonical website palette values", () => {
    expect(emailTheme.color.bg).toBe("#FAF6F1");
    expect(emailTheme.color.primary).toBe("#2C3E2D");
    expect(emailTheme.color.accent).toBe("#8B7A30");
    expect(emailTheme.color.text).toBe("#1A1A2E");
  });
});

describe("emailWrap", () => {
  it("wraps body content with header gradient and default footer", () => {
    const html = emailWrap("<p>Hello</p>");
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("linear-gradient");
    expect(html).toContain("2921 Landmark Place");
  });

  it("uses an override footer when provided", () => {
    const html = emailWrap("<p>Body</p>", "<div>custom-footer</div>");
    expect(html).toContain("custom-footer");
    expect(html).not.toContain("2921 Landmark Place");
  });

  it("renders the logo using the configured app URL", () => {
    const html = emailWrap("<p>x</p>");
    expect(html).toContain("/logo-white.png");
  });
});

describe("defaultFooter", () => {
  it("includes the company address (CAN-SPAM)", () => {
    expect(defaultFooter()).toContain("2921 Landmark Place, Suite 215, Madison, WI 53713");
  });
});

describe("emailButton", () => {
  it("renders a pill-shaped CTA with label and href", () => {
    const html = emailButton("Click me", "https://example.com/foo");
    expect(html).toContain('href="https://example.com/foo"');
    expect(html).toContain("Click me");
    expect(html).toContain("border-radius: 999px");
  });
});

describe("emailHeading", () => {
  it("uses the serif font for the heading", () => {
    expect(emailHeading("Hi")).toContain("Cormorant Garamond");
  });
});
