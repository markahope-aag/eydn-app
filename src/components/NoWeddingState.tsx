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
        {feature ? `Set up your wedding to use ${feature}` : "Set up your wedding to get started"}
      </h2>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Complete a quick setup to unlock your personalized planning timeline, budget tracker, guest list, and AI assistant.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/dashboard/onboarding" className="btn-primary">
          Set Up Your Wedding
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
