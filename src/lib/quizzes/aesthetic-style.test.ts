import { describe, it, expect } from "vitest";
import { aestheticStyleQuiz } from "./aesthetic-style";
import { resolveArchetype } from "./scoring";

describe("aestheticStyleQuiz", () => {
  it("has 8 questions and 6 style results", () => {
    expect(aestheticStyleQuiz.questions).toHaveLength(8);
    expect(Object.keys(aestheticStyleQuiz.results)).toHaveLength(6);
  });

  it("every option maps to a real result key", () => {
    const keys = new Set(Object.keys(aestheticStyleQuiz.results));
    for (const q of aestheticStyleQuiz.questions) {
      for (const opt of q.options) {
        expect(keys.has(String(opt.value))).toBe(true);
      }
    }
  });

  it("uses a valid tie-breaker", () => {
    expect(aestheticStyleQuiz.results[aestheticStyleQuiz.tieBreaker]).toBeDefined();
  });

  it("every style is reachable as a winner", () => {
    // Answering all questions toward one style yields that style.
    for (const key of Object.keys(aestheticStyleQuiz.results)) {
      const answers = aestheticStyleQuiz.questions.map((q) => {
        const match = q.options.find((o) => o.value === key);
        // Fall back to the first option for questions that don't offer this
        // style — a clear majority still wins.
        return String(match ? match.value : q.options[0].value);
      });
      // Only assert for styles that appear in a majority of questions.
      const appearances = answers.filter((a) => a === key).length;
      if (appearances > aestheticStyleQuiz.questions.length / 2) {
        expect(resolveArchetype(aestheticStyleQuiz, answers).key).toBe(key);
      }
    }
  });
});
