"use client";

import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

interface AuthCTAProps {
  signedOutLabel?: string;
  signedOutSecondary?: ReactNode;
  variant?: "hero" | "pricing" | "final";
}

const buttonBase = {
  background: "linear-gradient(135deg, #D4A5A5, #C08080)",
  color: "#fff",
  borderRadius: 100,
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  transition: "all 200ms",
  textDecoration: "none",
} as const;

const variants = {
  hero: {
    padding: "16px 36px",
    fontSize: 15,
    background: "#2C3E2D",
  },
  pricing: {
    padding: "18px 48px",
    fontSize: 16,
    boxShadow: "0 4px 20px rgba(192,128,128,0.4)",
  },
  final: {
    padding: "18px 48px",
    fontSize: 16,
    boxShadow: "0 4px 20px rgba(192,128,128,0.3)",
  },
} as const;

export function AuthCTA({ signedOutLabel = "Start Planning Today", signedOutSecondary, variant = "hero" }: AuthCTAProps) {
  const style = { ...buttonBase, ...variants[variant] };

  return (
    <>
      <Show when="signed-out">
        <SignUpButton>
          <button className="auth-cta-btn" style={style}>
            {signedOutLabel}
          </button>
        </SignUpButton>
        {signedOutSecondary}
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            ...style,
            ...(variant === "hero" ? {} : { background: "linear-gradient(135deg, #D4A5A5, #C08080)" }),
          }}
        >
          Go to Dashboard
        </Link>
      </Show>
    </>
  );
}
