import { QuizRunner } from "@/components/tools/QuizRunner";
import { aestheticStyleQuiz } from "@/lib/quizzes/aesthetic-style";

export default function WeddingStylePage() {
  return (
    <div id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      <QuizRunner quiz={aestheticStyleQuiz} />
    </div>
  );
}
