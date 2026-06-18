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

/**
 * Optional lead-magnet landing content rendered on the quiz intro screen.
 * When present, the intro becomes a fuller landing page (hero, benefits,
 * result teaser, FAQ); when absent, the minimal intro is shown.
 */
export type QuizLanding = {
  heroSubhead?: string;
  // Outcome-driven CTA label for the start buttons; falls back to "Start the quiz".
  ctaText?: string;
  // Optional pull-quote. Only render real quotes — leave undefined otherwise.
  testimonial?: { quote: string; attribution?: string };
  benefits: { title: string; body: string; icon?: "checklist" | "lightbulb" | "hand" }[];
  resultsTeaser?: { label: string; blurb: string }[];
  resultsTeaserTitle?: string;
  socialProof?: string;
  faq: { q: string; a: string }[];
};

export type ArchetypeQuiz = {
  id: "planning_style" | "aesthetic_style";
  slug: "wedding-planning-style" | "wedding-style";
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
  results: Record<string, QuizResult>;
  // Ordered list of archetype keys for tie-breaker resolution
  tieBreaker: string;
  landing?: QuizLanding;
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
  landing?: QuizLanding;
};

export type Quiz = ArchetypeQuiz | ScoreBandQuiz;
