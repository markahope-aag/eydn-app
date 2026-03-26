import Link from "next/link";

/**
 * Shown when a user hasn't set up their wedding yet.
 * Used by dashboard pages when the API returns 404 (no wedding found).
 */
export function NoWeddingState({ feature }: { feature?: string }) {
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <p className="text-[48px] mb-4">💍</p>
      <h2 className="text-[20px] font-semibold text-plum">
        {feature ? `${feature} needs a wedding first` : "Let's set up your wedding"}
      </h2>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Answer a few quick questions and Eydn will build your timeline, budget, guest list, and planning tools.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/dashboard/onboarding" className="btn-primary">
          Get started
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
