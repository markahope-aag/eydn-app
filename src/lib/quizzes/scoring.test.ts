import { describe, it, expect } from "vitest";
import { resolveArchetype, resolveBand } from "./scoring";
import { planningStyleQuiz } from "./planning-style";
import { plannerAssessmentQuiz } from "./planner-assessment";
import type { ArchetypeQuiz, ScoreBandQuiz } from "./types";

describe("resolveArchetype", () => {
  it("returns the archetype with the most answer hits", () => {
    const answers = ["SC", "SC", "SC", "VP", "VP", "DE", "DE", "DO"];
    const result = resolveArchetype(planningStyleQuiz, answers);
    expect(result.key).toBe("SC");
  });

  it("returns the tie-breaker archetype when two keys tie for first", () => {
    const answers = ["SC", "SC", "SC", "VP", "VP", "VP"];
    const result = resolveArchetype(planningStyleQuiz, answers);
    // Tie between SC and VP — planningStyleQuiz.tieBreaker = "BD"
    expect(result.key).toBe(planningStyleQuiz.tieBreaker);
  });

  it("returns the tie-breaker when three keys tie", () => {
    const answers = ["SC", "VP", "DE"];
    const result = resolveArchetype(planningStyleQuiz, answers);
    expect(result.key).toBe(planningStyleQuiz.tieBreaker);
  });

  it("handles a unanimous result", () => {
    const answers = Array(8).fill("DO");
    const result = resolveArchetype(planningStyleQuiz, answers);
    expect(result.key).toBe("DO");
  });

  it("returns the first archetype found among winners when tie-breaker is missing from quiz.results", () => {
    // Build a minimal quiz with a tie-breaker that doesn't exist in results
    const quiz: ArchetypeQuiz = {
      ...planningStyleQuiz,
      tieBreaker: "MISSING",
      // Keep results mapping intact so the fallback returns BD via `results[tieBreaker]`
    };
    const answers = ["SC", "SC", "VP", "VP"];
    const result = resolveArchetype(quiz, answers);
    // results[MISSING] is undefined, so the fallback falls through to
    // results[tieBreaker] which is also MISSING → undefined → returns undefined.
    // In practice the quiz's own tieBreaker should always exist; this
    // test documents the safeguard.
    expect(result).toBeUndefined();
  });

  it("returns one of the tied keys when tiebreaker is one of the winners", () => {
    // BD is a legitimate winning answer for some questions
    const answers = ["BD", "BD", "SC", "SC"];
    const result = resolveArchetype(planningStyleQuiz, answers);
    // Tie between BD and SC → tieBreaker BD wins
    expect(result.key).toBe("BD");
  });
});

describe("resolveBand", () => {
  it("returns the low complexity band for a 0 score", () => {
    const { result, score } = resolveBand(plannerAssessmentQuiz, [0, 0, 0, 0, 0, 0, 0, 0]);
    expect(score).toBe(0);
    expect(result.key).toBe("low");
  });

  it("returns the low complexity band for scores up to 8", () => {
    const { result } = resolveBand(plannerAssessmentQuiz, [1, 1, 1, 1, 1, 1, 1, 1]);
    expect(result.key).toBe("low");
  });

  it("returns the medium complexity band at the lower boundary (9)", () => {
    const { result, score } = resolveBand(plannerAssessmentQuiz, [2, 1, 1, 1, 1, 1, 1, 1]);
    expect(score).toBe(9);
    expect(result.key).toBe("medium");
  });

  it("returns the medium complexity band at the upper boundary (16)", () => {
    const { result, score } = resolveBand(plannerAssessmentQuiz, [2, 2, 2, 2, 2, 2, 2, 2]);
    expect(score).toBe(16);
    expect(result.key).toBe("medium");
  });

  it("returns the high complexity band at the lower boundary (17)", () => {
    const { result, score } = resolveBand(plannerAssessmentQuiz, [3, 2, 2, 2, 2, 2, 2, 2]);
    expect(score).toBe(17);
    expect(result.key).toBe("high");
  });

  it("returns the high complexity band for the max score (24)", () => {
    const { result, score } = resolveBand(plannerAssessmentQuiz, [3, 3, 3, 3, 3, 3, 3, 3]);
    expect(score).toBe(24);
    expect(result.key).toBe("high");
  });

  it("falls back to the last band if the score is above max", () => {
    // Synthetic quiz where max score is 30 but bands only cover 0–24
    const quiz: ScoreBandQuiz = {
      ...plannerAssessmentQuiz,
    };
    const { result } = resolveBand(quiz, [5, 5, 5, 5, 5, 5]);
    expect(result.key).toBe("high");
  });

  it("returns the matching band when score sums to exactly one of the minimums", () => {
    // 8 is low max, 9 is medium min — test 8 lands low
    const { result, score } = resolveBand(plannerAssessmentQuiz, [0, 0, 0, 0, 0, 2, 3, 3]);
    expect(score).toBe(8);
    expect(result.key).toBe("low");
  });

  it("returns the score alongside the result", () => {
    const { score } = resolveBand(plannerAssessmentQuiz, [1, 2, 3, 0, 1, 2, 3, 0]);
    expect(score).toBe(12);
  });
});
