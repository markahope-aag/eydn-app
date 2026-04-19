import { QuizRunner } from "@/components/tools/QuizRunner";
import { planningStyleQuiz } from "@/lib/quizzes/planning-style";

export default function PlanningStylePage() {
  return (
    <div id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      <QuizRunner quiz={planningStyleQuiz} />
    </div>
  );
}
