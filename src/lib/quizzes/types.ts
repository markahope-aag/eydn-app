export type QuizOption = {
  label: string;
  // Map to archetype key (quiz 1) or numeric points (quiz 2)
  value: string | number;
};

export type QuizQuestion = {
  id: number;
  prompt: string;
  options: QuizOption[];
};

export type QuizResult = {
  key: string;
  label: string;
  headline: string;
  body: string;
  eydnAngle: string;
};

export type ArchetypeQuiz = {
  id: "planning_style";
  slug: "wedding-planning-style";
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
  results: Record<string, QuizResult>;
  // Ordered list of archetype keys for tie-breaker resolution
  tieBreaker: string;
};

export type ScoreBandQuiz = {
  id: "planner_assessment";
  slug: "do-i-need-a-planner";
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
  results: QuizResult[];
  // Score ranges (inclusive) mapped to result index
  bands: { min: number; max: number; resultIndex: number }[];
};

export type Quiz = ArchetypeQuiz | ScoreBandQuiz;
