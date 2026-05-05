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

type Plan = "lifetime" | "monthly";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [validating, setValidating] = useState(false);

  const lifetimeFinalPrice = promoResult?.valid ? promoResult.final_price! : 79;
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
        toast.success(`Code applied. You save $${data.discount_amount!.toFixed(2)} on Lifetime.`);
      } else {
        toast.error(data.reason || "That code didn't work.");
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

  async function handleLifetime() {
    setLoadingPlan("lifetime");
    try {
      const body = promoResult?.valid ? { promoCode: promoResult.code } : {};
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "Already purchased" || data.error === "You already have an active plan") {
          toast.success("You already have full access.");
          return;
        }
        throw new Error(data.error || `Subscribe failed (${res.status})`);
      }
      trackPurchase(lifetimeFinalPrice);
      if (data.purchased) {
        window.location.href = data.url || "/dashboard?purchased=true";
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[SUBSCRIBE LIFETIME]", msg);
      toast.error(`Couldn't start checkout: ${msg}`);
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleMonthly() {
    setLoadingPlan("monthly");
    try {
      const res = await fetch("/api/subscribe/monthly", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "You already have an active plan") {
          toast.success("You already have full access.");
          return;
        }
        throw new Error(data.error || `Subscribe failed (${res.status})`);
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[SUBSCRIBE MONTHLY]", msg);
      toast.error(`Couldn't start checkout: ${msg}`);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center">
        <h1>Two ways to unlock Eydn</h1>
        <p className="mt-2 text-[15px] text-muted">
          Pick the one that fits how you want to pay. Same features either way.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-start">
        {/* Lifetime — featured */}
        <div className="card-summary relative p-6 sm:p-8 border-2 border-violet md:order-1 order-1" style={{ overflow: "visible" }}>
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide text-white whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, var(--violet), var(--soft-violet))" }}
          >
            Best value
          </div>

          <div className="text-center">
            <div className="text-[13px] font-semibold text-violet uppercase tracking-wide">
              Lifetime
            </div>
            <div
              className="mt-3"
              style={{
                background: "linear-gradient(135deg, var(--violet), var(--soft-violet))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {hasDiscount ? (
                <div>
                  <span className="text-[24px] font-semibold line-through opacity-50">$79</span>
                  <span className="text-[48px] font-semibold leading-none ml-2">
                    ${lifetimeFinalPrice.toFixed(0)}
                  </span>
                </div>
              ) : (
                <span className="text-[48px] font-semibold leading-none">$79</span>
              )}
            </div>
            <p className="mt-2 text-[14px] text-muted">One payment. 1 wedding. Yours forever.</p>
            {hasDiscount && (
              <p className="mt-1 text-[13px] text-violet font-semibold">
                {promoResult!.code} applied — saving ${promoResult!.discount_amount!.toFixed(2)}
              </p>
            )}
          </div>

          <div className="mt-6 text-left space-y-3">
            <Feature text="Everything in Pro, forever" />
            <Feature text="AI wedding assistant (Ask Eydn)" />
            <Feature text="PDF day-of plan export" />
            <Feature text="File attachments on tasks and vendors" />
            <Feature text="Unlimited tasks, guests, and vendors" />
            <Feature text="Budget tracker with vendor linking" />
            <Feature text="Seating chart and day-of timeline" />
            <Feature text="Email templates for vendor outreach" />
          </div>

          {/* Promo code — Lifetime only */}
          <div className="mt-6">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      validatePromo();
                    }
                  }}
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
            onClick={handleLifetime}
            disabled={loadingPlan !== null}
            className="btn-primary w-full mt-8 disabled:opacity-50"
          >
            {loadingPlan === "lifetime"
              ? "Redirecting..."
              : lifetimeFinalPrice === 0
              ? "Get Lifetime — Free"
              : `Get Lifetime — $${lifetimeFinalPrice.toFixed(0)}`}
          </button>

          <p className="mt-3 text-center text-[12px] text-muted">
            One-time payment via Stripe. No renewals, no surprises.
          </p>
        </div>

        {/* Monthly — hedge */}
        <div className="card-summary p-6 sm:p-8 md:order-2 order-2">
          <div className="text-center">
            <div className="text-[13px] font-semibold text-muted uppercase tracking-wide">
              Monthly
            </div>
            <div className="mt-3">
              <span className="text-[48px] font-semibold leading-none text-plum">$14.99</span>
              <span className="text-[15px] text-muted ml-1">/ month</span>
            </div>
            <p className="mt-2 text-[14px] text-muted">
              Month-to-month. Cancel anytime.
            </p>
          </div>

          <div className="mt-6 text-left space-y-3">
            <Feature text="Everything in Pro, while subscribed" />
            <Feature text="AI wedding assistant (Ask Eydn)" />
            <Feature text="PDF day-of plan export" />
            <Feature text="File attachments on tasks and vendors" />
            <Feature text="Unlimited tasks, guests, and vendors" />
            <Feature text="Budget tracker with vendor linking" />
            <Feature text="Seating chart and day-of timeline" />
            <Feature text="Email templates for vendor outreach" />
          </div>

          <button
            onClick={handleMonthly}
            disabled={loadingPlan !== null}
            className="btn-secondary w-full mt-8 disabled:opacity-50"
          >
            {loadingPlan === "monthly" ? "Redirecting..." : "Start Monthly — $14.99"}
          </button>

          <p className="mt-3 text-center text-[12px] text-muted">
            Six months of Monthly costs more than Lifetime.
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-[13px] text-muted max-w-md mx-auto">
        Both plans unlock the same features. We don&apos;t take money from vendors, sell your data,
        or let businesses influence what the AI recommends. That&apos;s{" "}
        <a href="/pledge" className="text-violet hover:text-soft-violet underline">
          the Eydn Pledge
        </a>
        .
      </p>
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
