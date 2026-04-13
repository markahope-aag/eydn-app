import type { ArchetypeQuiz, QuizResult, ScoreBandQuiz } from "./types";

/**
 * Resolve an archetype quiz — each answer is a string key, winner is the
 * most-frequent key, ties broken by `tieBreaker`.
 */
export function resolveArchetype(
  quiz: ArchetypeQuiz,
  answers: string[]
): QuizResult {
  const tally: Record<string, number> = {};
  for (const a of answers) {
    tally[a] = (tally[a] || 0) + 1;
  }

  let maxCount = -1;
  let winners: string[] = [];
  for (const [key, count] of Object.entries(tally)) {
    if (count > maxCount) {
      maxCount = count;
      winners = [key];
    } else if (count === maxCount) {
      winners.push(key);
    }
  }

  const winner = winners.length === 1 ? winners[0] : quiz.tieBreaker;
  return quiz.results[winner] || quiz.results[quiz.tieBreaker];
}

/**
 * Resolve a score-band quiz — each answer is a numeric point value,
 * sum is matched against a band range.
 */
export function resolveBand(
  quiz: ScoreBandQuiz,
  answers: number[]
): { result: QuizResult; score: number } {
  const score = answers.reduce((sum, a) => sum + a, 0);
  const band = quiz.bands.find((b) => score >= b.min && score <= b.max)
    || quiz.bands[quiz.bands.length - 1];
  return { result: quiz.results[band.resultIndex], score };
}
