import type { Metadata } from "next";
import { Suspense } from "react";
import WeddingBudgetCalculator from "@/components/tools/WeddingBudgetCalculator";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return (
    <div className="p-4 bg-white min-h-screen">
      <Suspense fallback={<div className="h-96 animate-pulse bg-gray-50 rounded-2xl" />}>
        <WeddingBudgetCalculator />
      </Suspense>
      <p className="text-center text-[11px] text-muted/50 mt-4">
        Powered by{" "}
        <a href="https://eydn.app" target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">
          Eydn
        </a>
        {" "}&mdash; AI wedding planning &middot; $79 one-time
      </p>
    </div>
  );
}
