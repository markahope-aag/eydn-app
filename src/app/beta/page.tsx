"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

type BetaStatus = {
  beta_available: boolean;
  slots_remaining: number;
  total_slots: number;
  slots_taken: number;
};

export default function BetaPage() {
  const [status, setStatus] = useState<BetaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Waitlist form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetch("/api/public/beta")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/public/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
      setSuccessMessage(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="main-content" className="min-h-screen bg-whisper flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="eydn" width={120} height={28} className="h-7 w-auto" />
        </Link>
        <Link href="/sign-in" className="text-[14px] font-semibold text-violet hover:text-plum transition">
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="inline-block bg-violet/10 text-violet text-[13px] font-semibold px-4 py-1.5 rounded-full mb-6">
            {loading ? "Loading..." : status?.beta_available ? `${status.slots_remaining} of ${status.total_slots} spots left` : "Beta is full — join the waitlist"}
          </div>

          <h1 className="text-[36px] font-semibold text-plum leading-tight">
            {status?.beta_available
              ? "Join the Eydn Beta"
              : "Eydn Beta Waitlist"}
          </h1>
          <p className="mt-4 text-[17px] text-muted leading-relaxed max-w-md mx-auto">
            {status?.beta_available
              ? "Be one of the first to plan your wedding with Eydn — completely free. Limited to 50 couples."
              : "Our beta is full, but you can join the waitlist and get an exclusive 20% discount when we launch."}
          </p>

          {/* Beta available — direct sign-up, no promo code */}
          {status?.beta_available && !loading && (
            <div className="mt-8 card-summary p-8">
              <p className="text-[15px] text-plum font-semibold">Full access. No payment. No time limit.</p>
              <p className="mt-2 text-[14px] text-muted">
                Create your account and your beta spot is claimed automatically.
              </p>
              <Link
                href="/sign-up?redirect_url=/beta/claim"
                className="btn-primary w-full mt-6 block text-center"
              >
                Start Planning — Free
              </Link>
              <p className="mt-3 text-[12px] text-muted">
                {status.slots_remaining} of {status.total_slots} spots remaining
              </p>
            </div>
          )}

          {/* Beta full — waitlist form */}
          {!status?.beta_available && !loading && !submitted && (
            <form onSubmit={joinWaitlist} className="mt-8 card-summary p-8 text-left">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-lavender px-4 py-2 rounded-full">
                  <span className="text-[13px] font-semibold text-violet">
                    {status?.total_slots || 50}/{status?.total_slots || 50} beta spots taken
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-muted">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-muted">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full mt-6 disabled:opacity-50"
              >
                {submitting ? "Joining..." : "Join Waitlist & Get 20% Off"}
              </button>

              <p className="mt-3 text-[12px] text-muted text-center">
                You&apos;ll receive an exclusive 20% discount code via email immediately.
              </p>
            </form>
          )}

          {/* Success state */}
          {submitted && (
            <div className="mt-8 card-summary p-8 text-center">
              <h2 className="text-[20px] font-semibold text-plum">{successMessage}</h2>
              <p className="mt-3 text-[15px] text-muted">
                Check your inbox for your exclusive discount code. We&apos;ll notify you as soon as we launch.
              </p>
              <Link href="/" className="btn-secondary mt-6 inline-block">
                Back to Home
              </Link>
            </div>
          )}

          {/* Features preview */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3 text-left">
            {[
              { title: "AI Wedding Guide", desc: "Chat with Eydn for personalized planning advice" },
              { title: "Smart Timeline", desc: "50+ auto-generated tasks with real deadlines" },
              { title: "Budget Tracker", desc: "Track every dollar with vendor-linked expenses" },
            ].map((f) => (
              <div key={f.title} className="card p-4">
                <h3 className="text-[14px] font-semibold text-plum">{f.title}</h3>
                <p className="mt-1 text-[12px] text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-[12px] text-muted">
        <p>&copy; {new Date().getFullYear()} Eydn. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-plum">Privacy</Link>
          <Link href="/terms" className="hover:text-plum">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
