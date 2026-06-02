"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Quiz, QuizResult } from "@/lib/quizzes/types";
import { resolveArchetype, resolveBand } from "@/lib/quizzes/scoring";

type Stage = "intro" | "questions" | "gate" | "result";

interface Props {
  quiz: Quiz;
}

export function QuizRunner({ quiz }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [current, setCurrent] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const totalQuestions = quiz.questions.length;

  function start() {
    setStage("questions");
    setCurrent(0);
    setAnswers([]);
  }

  function pickOption(value: string | number) {
    const next = [...answers, value];
    setAnswers(next);
    if (next.length >= totalQuestions) {
      // Precompute the result so we can show it after the gate. Archetype
      // quizzes have a tieBreaker; score-band quizzes have bands.
      if ("tieBreaker" in quiz) {
        setResult(resolveArchetype(quiz, next as string[]));
      } else {
        const r = resolveBand(quiz, next as number[]);
        setResult(r.result);
        setScore(r.score);
      }
      setStage("gate");
    } else {
      setCurrent(current + 1);
    }
  }

  function back() {
    if (current === 0) return;
    setAnswers(answers.slice(0, -1));
    setCurrent(current - 1);
  }

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !result) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tools/quiz-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          email: email.trim(),
          first_name: firstName.trim(),
          result_key: result.key,
          result_label: result.label,
          answers,
          score,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't submit your quiz");
      }
      setStage("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Intro stage ──────────────────────────────────────────
  if (stage === "intro") {
    const landing = quiz.landing;

    // Minimal intro (quizzes without landing content).
    if (!landing) {
      return (
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-serif text-[44px] leading-tight text-plum">{quiz.title}</h1>
          <p className="mt-4 text-[17px] text-muted leading-relaxed">{quiz.subtitle}</p>
          <button onClick={start} className="mt-10 btn-primary px-10 py-4 text-[15px]">
            Start quiz
          </button>
          <p className="mt-4 text-[12px] text-muted">
            Takes 2 minutes. We&apos;ll ask for your email before showing your result.
          </p>
        </div>
      );
    }

    // Full lead-magnet landing page.
    return (
      <div>
        {/* Hero */}
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-[44px] leading-tight text-plum">{quiz.title}</h1>
          <p className="mt-4 text-[17px] text-muted leading-relaxed">
            {landing.heroSubhead || quiz.subtitle}
          </p>
          <button onClick={start} className="mt-8 btn-primary px-10 py-4 text-[15px]">
            Start the quiz
          </button>
          <p className="mt-4 text-[12px] text-muted">
            Free · about 2 minutes · we&apos;ll email your result
          </p>
        </div>

        {/* Benefits — what you'll get */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {landing.benefits.map((b, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-6">
              <div className="text-[15px] font-semibold text-plum">{b.title}</div>
              <p className="mt-2 text-[14px] text-muted leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        {/* Result teaser */}
        {landing.resultsTeaser && landing.resultsTeaser.length > 0 && (
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-[28px] text-plum text-center">
              {landing.resultsTeaserTitle || "Your possible results"}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {landing.resultsTeaser.map((r, i) => (
                <div key={i} className="rounded-xl bg-lavender/30 px-4 py-3">
                  <div className="text-[14px] font-semibold text-plum">{r.label}</div>
                  <p className="text-[13px] text-muted">{r.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {landing.socialProof && (
          <p className="mt-12 text-center text-[14px] text-muted">{landing.socialProof}</p>
        )}

        {/* FAQ */}
        {landing.faq.length > 0 && (
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-[28px] text-plum text-center">Questions</h2>
            <div className="mt-6 space-y-4">
              {landing.faq.map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-white p-5">
                  <div className="text-[15px] font-semibold text-plum">{f.q}</div>
                  <p className="mt-1.5 text-[14px] text-muted leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closing CTA */}
        <div className="mt-12 text-center">
          <button onClick={start} className="btn-primary px-10 py-4 text-[15px]">
            Start the quiz
          </button>
        </div>
      </div>
    );
  }

  // ─── Question stage ───────────────────────────────────────
  if (stage === "questions") {
    const q = quiz.questions[current];
    const progress = ((current + 1) / totalQuestions) * 100;
    return (
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-muted uppercase tracking-wide font-semibold">
              Question {current + 1} of {totalQuestions}
            </span>
            {current > 0 && (
              <button
                onClick={back}
                className="text-[13px] text-muted hover:text-plum transition"
              >
                ← Back
              </button>
            )}
          </div>
          <div
            className="h-1 rounded-full bg-lavender/40 overflow-hidden"
            role="progressbar"
            aria-valuenow={current + 1}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-label={`Question ${current + 1} of ${totalQuestions}`}
          >
            <div
              className="h-full bg-brand-gradient transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <h2 id="quiz-question" className="font-serif text-[28px] text-plum leading-snug mb-8">
          {q.prompt}
        </h2>

        <div className="space-y-3" role="group" aria-labelledby="quiz-question">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pickOption(opt.value)}
              className="w-full text-left p-5 rounded-xl border border-border bg-white hover:border-violet hover:bg-lavender/20 focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet/30 transition group"
            >
              <span className="text-[15px] text-plum group-hover:text-violet transition">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Gate stage — email capture ──────────────────────────
  if (stage === "gate" && result) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-lavender/40 text-[12px] font-semibold text-violet uppercase tracking-wide mb-4">
          Your result is ready
        </div>
        <h2 className="font-serif text-[36px] text-plum leading-tight">
          One last thing.
        </h2>
        <p className="mt-3 text-[15px] text-muted">
          Tell us where to send your result and we&apos;ll show it right now. Plus one
          email a week with planning tips &mdash; no spam, unsubscribe anytime.
        </p>

        <form onSubmit={submitGate} className="mt-8 space-y-3 text-left">
          <label htmlFor="quiz-first-name" className="sr-only">Your first name</label>
          <input
            id="quiz-first-name"
            type="text"
            placeholder="Your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-plum outline-none focus:border-violet"
          />
          <label htmlFor="quiz-email" className="sr-only">Your email address</label>
          <input
            id="quiz-email"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-plum outline-none focus:border-violet"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="w-full btn-primary disabled:opacity-50"
          >
            {submitting ? "Loading..." : "Show me my result"}
          </button>
        </form>
      </div>
    );
  }

  // ─── Result stage ─────────────────────────────────────────
  if (stage === "result" && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-lavender/40 text-[12px] font-semibold text-violet uppercase tracking-wide mb-4">
            Your result
          </div>
          {score !== null && (
            <div className="text-[13px] text-muted mb-2">
              Complexity score: {score} / 24
            </div>
          )}
          <h1 className="font-serif text-[44px] leading-tight text-plum">
            {result.headline}
          </h1>
        </div>

        <div className="mt-8 card-summary p-8">
          <p className="text-[16px] text-plum leading-relaxed whitespace-pre-line">
            {result.body}
          </p>
          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-[12px] font-semibold text-violet uppercase tracking-wide mb-2">
              How Eydn helps you
            </div>
            <p className="text-[15px] text-plum leading-relaxed">
              {result.eydnAngle}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sign-up" className="btn-primary text-center">
            Try Eydn free
          </Link>
          <Link href="/tools" className="btn-secondary text-center">
            More free tools
          </Link>
        </div>

        <p className="mt-6 text-center text-[13px] text-muted">
          Your result is on its way to <strong>{email}</strong> — check your inbox in a minute.
        </p>
      </div>
    );
  }

  return null;
}
