"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trackPurchase } from "@/lib/analytics";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "Already purchased") {
          toast.success("You already have full access.");
          return;
        }
        throw new Error(data.error);
      }
      const { url } = await res.json();
      trackPurchase();
      if (url) window.location.href = url;
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      <h1>Unlock Eydn</h1>
      <p className="mt-2 text-[15px] text-muted">
        Your free trial has ended. Get full access to plan your perfect wedding.
      </p>

      <div className="mt-8 card-summary p-8">
        <div
          style={{
            background: "linear-gradient(135deg, var(--violet), var(--soft-violet))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          <span className="text-[48px] font-semibold leading-none">$79</span>
        </div>
        <p className="mt-2 text-[15px] text-muted">One-time payment. 1 wedding. Forever.</p>

        <div className="mt-6 text-left space-y-3">
          <Feature text="AI wedding assistant (Ask Eydn)" />
          <Feature text="PDF day-of plan export" />
          <Feature text="File attachments on tasks and vendors" />
          <Feature text="Unlimited tasks, guests, and vendors" />
          <Feature text="Budget tracker with vendor linking" />
          <Feature text="Seating chart builder" />
          <Feature text="Day-of planner with timeline" />
          <Feature text="Email templates for vendor outreach" />
        </div>

        <button
          onClick={handlePurchase}
          disabled={loading}
          className="btn-primary w-full mt-8 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Get Full Access — $79"}
        </button>

        <p className="mt-3 text-[12px] text-muted">
          Secure payment via Stripe. No subscription — pay once, use forever.
        </p>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-lavender flex items-center justify-center flex-shrink-0">
        <span className="text-violet text-[12px]">✓</span>
      </div>
      <span className="text-[15px] text-plum">{text}</span>
    </div>
  );
}
