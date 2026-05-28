"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

// Catches render errors thrown in any dashboard subroute. Renders inside
// the dashboard layout so the sidebar stays visible — the couple can
// navigate to a different page instead of being kicked to a blank error
// screen. global-error.tsx is the last resort if even the dashboard
// layout itself throws.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[12px] uppercase tracking-widest text-violet font-semibold">
          Something went wrong
        </p>
        <h1 className="mt-3 text-[28px] font-semibold text-plum">
          We hit a snag on this page
        </h1>
        <p className="mt-3 text-[15px] text-muted leading-relaxed">
          Our team has been notified automatically. You can try this page again,
          or jump back to your dashboard — your data is safe either way.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary btn-sm">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary btn-sm">
            Back to dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-[11px] text-muted/70 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
