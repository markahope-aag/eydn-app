import { QuizRunner } from "@/components/tools/QuizRunner";
import { plannerAssessmentQuiz } from "@/lib/quizzes/planner-assessment";

export default function PlannerAssessmentPage() {
  return (
    <div id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      <QuizRunner quiz={plannerAssessmentQuiz} />
    </div>
  );
}
