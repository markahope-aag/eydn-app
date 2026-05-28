"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

// Catch-all for marketing-area errors (blog, board, static pages). The
// wedding website route has its own themed error.tsx that overrides this.
export default function MarketingError({
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
    <div className="min-h-screen bg-whisper flex items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-[12px] uppercase tracking-widest text-violet font-semibold">
          Something went wrong
        </p>
        <h1 className="mt-3 text-[28px] font-semibold text-plum">
          This page didn&apos;t load
        </h1>
        <p className="mt-3 text-[15px] text-muted leading-relaxed">
          Our team has been notified. You can try again, or head back to the
          main site.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary btn-sm">
            Try again
          </button>
          <Link href="/" className="btn-secondary btn-sm">
            Back to Eydn
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
