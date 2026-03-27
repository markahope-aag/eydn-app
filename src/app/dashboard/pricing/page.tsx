"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trackPurchase } from "@/lib/analytics";

type PromoResult = {
  valid: boolean;
  reason?: string;
  code?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  original_price?: number;
  discount_amount?: number;
  final_price?: number;
};

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [validating, setValidating] = useState(false);

  const finalPrice = promoResult?.valid ? promoResult.final_price! : 79;
  const hasDiscount = promoResult?.valid && promoResult.discount_amount! > 0;

  async function validatePromo() {
    if (!promoInput.trim()) return;
    setValidating(true);

    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput }),
      });
      const data: PromoResult = await res.json();
      setPromoResult(data);

      if (data.valid) {
        toast.success(`Code applied — you save $${data.discount_amount!.toFixed(2)}!`);
      } else {
        toast.error(data.reason || "Invalid code");
      }
    } catch {
      toast.error("That code didn't work. Check it and try again.");
    } finally {
      setValidating(false);
    }
  }

  function clearPromo() {
    setPromoResult(null);
    setPromoInput("");
  }

  async function handlePurchase() {
    setLoading(true);
    try {
      const body = promoResult?.valid ? { promoCode: promoResult.code } : {};
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "Already purchased") {
          toast.success("You already have full access.");
          return;
        }
        throw new Error(data.error);
      }
      const data = await res.json();
      trackPurchase(finalPrice);
      if (data.purchased) {
        // $0 purchase — redirect directly
        window.location.href = data.url || "/dashboard?purchased=true";
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("That didn't go through. Try again.");
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

      <div className="mt-8 card-summary p-4 sm:p-6 md:p-8">
        <div
          style={{
            background: "linear-gradient(135deg, var(--violet), var(--soft-violet))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {hasDiscount ? (
            <div>
              <span className="text-[28px] font-semibold line-through opacity-50">$79</span>
              <span className="text-[48px] font-semibold leading-none ml-3">${finalPrice.toFixed(0)}</span>
            </div>
          ) : (
            <span className="text-[48px] font-semibold leading-none">$79</span>
          )}
        </div>
        <p className="mt-2 text-[15px] text-muted">One-time payment. 1 wedding. Forever.</p>
        {hasDiscount && (
          <p className="mt-1 text-[13px] text-violet font-semibold">
            {promoResult!.code} applied — saving ${promoResult!.discount_amount!.toFixed(2)}
          </p>
        )}

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

        {/* Promo code section */}
        <div className="mt-6 text-left">
          {!showPromo && !hasDiscount && (
            <button
              onClick={() => setShowPromo(true)}
              className="text-[13px] text-violet hover:text-soft-violet font-semibold"
            >
              Have a promo code?
            </button>
          )}
          {showPromo && !hasDiscount && (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validatePromo(); } }}
                className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px] font-mono uppercase"
              />
              <button
                onClick={validatePromo}
                disabled={validating || !promoInput.trim()}
                className="btn-secondary btn-sm disabled:opacity-50"
              >
                {validating ? "..." : "Apply"}
              </button>
            </div>
          )}
          {hasDiscount && (
            <button onClick={clearPromo} className="text-[12px] text-muted hover:text-plum">
              Remove promo code
            </button>
          )}
        </div>

        <button
          onClick={handlePurchase}
          disabled={loading}
          className="btn-primary w-full mt-8 disabled:opacity-50"
        >
          {loading
            ? "Redirecting..."
            : finalPrice === 0
            ? "Get Full Access — Free"
            : `Get Full Access — $${finalPrice.toFixed(0)}`}
        </button>

        <p className="mt-3 text-[12px] text-muted">
          {finalPrice === 0
            ? "No payment required with your promo code."
            : "Secure payment via Stripe. No subscription — pay once, use forever."}
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
