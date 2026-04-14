import { describe, it, expect } from "vitest";
import { getQuizResultEmail } from "./email-quiz";
import type { QuizResult } from "./quizzes/types";

const sampleResult: QuizResult = {
  key: "SC",
  label: "The Spreadsheet Commander",
  headline: "The Spreadsheet Commander",
  body: "You plan like a project manager.\n\nThe risk isn't that you'll miss something.",
  eydnAngle: "Your task timeline, budget tracker, and day-of binder are already built.",
};

describe("getQuizResultEmail", () => {
  it("uses the result headline in the subject line", () => {
    const { subject } = getQuizResultEmail(
      "What's your wedding planning style?",
      sampleResult,
      "Alice",
      null
    );
    expect(subject).toBe("Your result: The Spreadsheet Commander");
  });

  it("greets the user by first name", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "Alice Smith", null);
    expect(html).toContain("Hi Alice");
  });

  it("falls back to 'there' when firstName is empty", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "", null);
    expect(html).toContain("Hi there");
  });

  it("renders the quiz title in the eyebrow", () => {
    const { html } = getQuizResultEmail(
      "What's your wedding planning style?",
      sampleResult,
      "Alice",
      null
    );
    expect(html).toContain("What&#39;s your wedding planning style?");
  });

  it("includes the score when provided", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "Alice", 18);
    expect(html).toContain("Score 18/24");
  });

  it("omits the score divider when score is null", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "Alice", null);
    expect(html).not.toContain("Score");
  });

  it("renders body paragraphs split on double newlines", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "Alice", null);
    expect(html).toContain("<p>You plan like a project manager.</p>");
    expect(html).toContain("<p>The risk isn&#39;t that you&#39;ll miss something.</p>");
  });

  it("renders the Eydn angle in its own styled block", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "Alice", null);
    expect(html).toContain("How Eydn helps you");
    expect(html).toContain("Your task timeline, budget tracker, and day-of binder are already built");
  });

  it("includes the Try Eydn free CTA pointing at sign-up", () => {
    const { html } = getQuizResultEmail("Test", sampleResult, "Alice", null);
    expect(html).toContain("Try Eydn free");
    expect(html).toContain("/sign-up");
  });

  it("escapes HTML in firstName to prevent injection", () => {
    const { html } = getQuizResultEmail(
      "Test",
      sampleResult,
      "<script>alert(1)</script>",
      null
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in the quiz title", () => {
    const { html } = getQuizResultEmail(
      "<img onerror=xss>",
      sampleResult,
      "Alice",
      null
    );
    expect(html).not.toContain("<img onerror=xss>");
    expect(html).toContain("&lt;img onerror=xss&gt;");
  });

  it("escapes HTML in the result headline", () => {
    const { html } = getQuizResultEmail(
      "Test",
      { ...sampleResult, headline: "<b>Bold</b>" },
      "Alice",
      null
    );
    expect(html).not.toMatch(/<b>Bold<\/b>/);
    expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
  });
});
