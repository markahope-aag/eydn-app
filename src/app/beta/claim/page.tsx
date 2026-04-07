"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

export default function BetaClaimPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [state, setState] = useState<"loading" | "success" | "full" | "error">("loading");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      // Redirect to sign-up with return URL
      window.location.href = "/sign-up?redirect_url=/beta/claim";
      return;
    }

    fetch("/api/beta/claim", { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setState("success");
        } else if (data.beta_full) {
          setState("full");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen bg-whisper flex flex-col">
      <header className="flex items-center px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="eydn" width={120} height={28} className="h-7 w-auto" />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          {state === "loading" && (
            <>
              <div className="w-10 h-10 border-3 border-violet/30 border-t-violet rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-[15px] text-muted">Claiming your beta spot...</p>
            </>
          )}

          {state === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-confirmed-bg flex items-center justify-center mx-auto">
                <span className="text-confirmed-text text-[24px] font-bold">✓</span>
              </div>
              <h1 className="mt-4 text-[28px] font-semibold text-plum">You&apos;re in.</h1>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                Beta access activated — full features, no time limit, no payment. Start planning your wedding now.
              </p>
              <Link href="/dashboard" className="btn-primary w-full mt-8 block text-center">
                Go to Dashboard
              </Link>
            </>
          )}

          {state === "full" && (
            <>
              <h1 className="text-[28px] font-semibold text-plum">Beta is full</h1>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                All 50 spots have been claimed. Join the waitlist for an exclusive 20% discount when we launch.
              </p>
              <Link href="/beta" className="btn-primary mt-6 inline-block">
                Join the Waitlist
              </Link>
            </>
          )}

          {state === "error" && (
            <>
              <h1 className="text-[28px] font-semibold text-plum">Something went wrong</h1>
              <p className="mt-3 text-[15px] text-muted">
                We couldn&apos;t activate your beta access. Try again or contact support.
              </p>
              <button
                onClick={() => { setState("loading"); window.location.reload(); }}
                className="btn-primary mt-6"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
