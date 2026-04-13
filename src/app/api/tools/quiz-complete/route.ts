import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getQuizResultEmail } from "@/lib/email-quiz";
import { planningStyleQuiz } from "@/lib/quizzes/planning-style";
import { plannerAssessmentQuiz } from "@/lib/quizzes/planner-assessment";
import { isValidEmail, safeParseJSON, isParseError } from "@/lib/validation";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServer } from "@/lib/analytics-server";

type QuizId = "planning_style" | "planner_assessment";

const CADENCE_FORMS: Record<QuizId, string | undefined> = {
  planning_style: process.env.CADENCE_QUIZ_PLANNING_STYLE_FORM_ID,
  planner_assessment: process.env.CADENCE_QUIZ_PLANNER_ASSESSMENT_FORM_ID,
};

async function syncToCadence(
  email: string,
  firstName: string,
  quizId: QuizId
): Promise<void> {
  const cadenceUrl = process.env.CADENCE_URL;
  const formId = CADENCE_FORMS[quizId];
  if (!cadenceUrl || !formId) return;
  try {
    const res = await fetch(`${cadenceUrl.replace(/\/$/, "")}/api/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form_id: formId, email, first_name: firstName }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[QUIZ] Cadence sync failed ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[QUIZ] Cadence sync error:", err instanceof Error ? err.message : err);
  }
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`quiz-complete:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;

  const body = parsed as {
    quiz_id?: string;
    email?: string;
    first_name?: string;
    result_key?: string;
    result_label?: string;
    answers?: unknown;
    score?: number | null;
  };

  if (body.quiz_id !== "planning_style" && body.quiz_id !== "planner_assessment") {
    return NextResponse.json({ error: "Unknown quiz" }, { status: 400 });
  }
  const quizId = body.quiz_id as QuizId;

  const email = (body.email || "").trim().toLowerCase();
  const firstName = (body.first_name || "").trim();
  const resultKey = (body.result_key || "").trim();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!firstName) {
    return NextResponse.json({ error: "First name is required" }, { status: 400 });
  }
  if (!resultKey) {
    return NextResponse.json({ error: "Missing result" }, { status: 400 });
  }

  // Resolve the quiz + result server-side to avoid trusting client copy
  const quiz = quizId === "planning_style" ? planningStyleQuiz : plannerAssessmentQuiz;
  let result;
  if (quizId === "planning_style") {
    result = planningStyleQuiz.results[resultKey];
  } else {
    result = plannerAssessmentQuiz.results.find((r) => r.key === resultKey);
  }
  if (!result) {
    return NextResponse.json({ error: "Unknown result" }, { status: 400 });
  }

  const score =
    quizId === "planner_assessment" && typeof body.score === "number" ? body.score : null;
  const answers = Array.isArray(body.answers) ? body.answers : [];

  const supabase = createSupabaseAdmin();
  const { error: insertError } = await supabase.from("quiz_completions").insert({
    quiz_id: quizId,
    email,
    first_name: firstName,
    result_key: result.key,
    result_label: result.label,
    answers,
    score,
  });

  if (insertError) {
    console.error("[QUIZ]", insertError.message);
    // Don't fail the user-facing response — still try to deliver the email
  }

  // Fire-and-forget side effects
  const template = getQuizResultEmail(quiz.title, result, firstName, score);
  void sendEmail({ to: email, subject: template.subject, html: template.html });
  void syncToCadence(email, firstName, quizId);
  void captureServer(email, "quiz_completed", {
    quiz_id: quizId,
    result_key: result.key,
    score: score ?? undefined,
  });

  return NextResponse.json({ success: true });
}
