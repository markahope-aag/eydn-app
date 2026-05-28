"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Public-facing error fallback for the wedding website. Guests load this
// page on mobile networks — a blank gray Next.js error page would be a
// terrible first impression. Falls back to a themed neutral message that
// matches the wedding site's default forest/blush palette since the
// couple's actual theme isn't loaded when an error happens early.
export default function WeddingWebsiteError({
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
    <div
      className="min-h-screen flex items-center justify-center px-6 py-20"
      style={{ background: "linear-gradient(135deg, #2C3E2D, #D4A5A5)" }}
    >
      <div className="max-w-md text-center text-white">
        <p className="text-[12px] uppercase tracking-[0.25em] text-white/70 font-semibold">
          A little hiccup
        </p>
        <h1 className="mt-4 text-[36px] font-normal leading-tight" style={{ fontFamily: "Georgia, serif" }}>
          We couldn&apos;t load this page
        </h1>
        <p className="mt-4 text-[15px] text-white/85 leading-relaxed">
          Something went wrong on our end while loading the couple&apos;s
          wedding details. The team has been notified. Please try again in a
          moment.
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-[15px] font-semibold text-plum hover:bg-white/90 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
