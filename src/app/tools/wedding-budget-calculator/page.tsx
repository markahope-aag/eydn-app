import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import WeddingBudgetCalculator from "@/components/tools/WeddingBudgetCalculator";

export const metadata: Metadata = {
  title: "Wedding Budget Calculator 2026 — Free Tool",
  description:
    "See exactly where your wedding budget should go. Get a recommended breakdown across venue, catering, photography, florals, and more — adjusted for your state and guest count. Free, no sign-up required.",
  keywords: [
    "wedding budget calculator",
    "how much does a wedding cost",
    "wedding budget breakdown",
    "average wedding cost by state 2026",
    "wedding planning budget tool",
  ],
  alternates: { canonical: "/tools/wedding-budget-calculator" },
  openGraph: {
    title: "Free Wedding Budget Calculator 2026",
    description:
      "Instantly see how to allocate your wedding budget across every category — adjusted for your state, guest count, and season.",
    url: "/tools/wedding-budget-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Wedding Budget Calculator 2026",
    description:
      "Adjust your budget, guest count, state, and month — see your personalized breakdown instantly.",
  },
};

export default function WeddingBudgetCalculatorPage() {
  return (
    <main id="main-content" className="flex-1 bg-whisper">
      {/* Header */}
      <div className="bg-[#2C3E2D] py-16 px-6 text-center">
        <Link href="/" className="text-[14px] text-[#FAF6F1]/50 hover:text-[#FAF6F1]/70 transition">
          &larr; eydn.app
        </Link>
        <p className="mt-6 text-[13px] font-semibold tracking-widest uppercase text-[#FAF6F1]/50">
          Free planning tool
        </p>
        <h1 className="mt-3 text-[40px] md:text-[56px] font-semibold text-[#FAF6F1] leading-tight">
          Wedding Budget Calculator
        </h1>
        <p className="mt-4 text-[17px] text-[#FAF6F1]/80 max-w-xl mx-auto leading-relaxed">
          Adjust your total budget, guest count, state, and wedding month.
          Get a recommended allocation across every category — instantly.
        </p>
      </div>

      {/* Calculator */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Suspense fallback={<div className="h-96 animate-pulse bg-lavender/30 rounded-2xl" />}>
          <WeddingBudgetCalculator />
        </Suspense>
      </div>

      {/* SEO content */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="border-t border-border pt-12">
          <h2 className="text-[24px] font-semibold text-plum mb-4">
            How we calculate your wedding budget breakdown
          </h2>
          <div className="space-y-4 text-[15px] text-muted leading-relaxed">
            <p>
              Our allocations are based on industry survey data from over 10,000 couples married in 2025-2026.
              The national average wedding cost is $34,200-$36,000 in 2026, though the median
              is closer to $18,231 — meaning most couples spend significantly less than the headlines suggest.
            </p>
            <p>
              State adjustments reflect regional cost-of-living and vendor pricing differences.
              New Jersey and Hawaii average over $49,000; Wisconsin and Utah are closer to $19,000-$25,000.
              Seasonal adjustments reflect peak-season (June-October) vendor premiums of roughly 10-20%
              versus off-season (November-April) rates.
            </p>
            <p>
              We recommend reserving 9% of your total budget as a hidden cost buffer.
              Industry data shows couples encounter an average of $3,314 in unplanned expenses —
              service charges, gratuities, overtime fees, and day-of extras.
            </p>
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Eydn Wedding Budget Calculator",
            description:
              "Free wedding budget calculator. Get a personalized spending breakdown by category, adjusted for your state, guest count, and wedding month.",
            url: "https://eydn.app/tools/wedding-budget-calculator",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@type": "Organization", name: "Eydn", url: "https://eydn.app" },
          }),
        }}
      />
    </main>
  );
}
