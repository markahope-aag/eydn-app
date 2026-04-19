import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Marketing-page CTA with no Clerk dependency.
 *
 * Renders a plain `<Link>` to /sign-up so the marketing route tree can skip
 * loading the Clerk SDK entirely. The original AuthCTA (in this folder) does
 * a signed-in/signed-out branch that renders "Go to Dashboard" for returning
 * users — signed-in visitors on the marketing page will see "Start Planning
 * Today" instead, which is acceptable because most traffic is signed-out.
 */
interface AuthCTAStaticProps {
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
  display: "inline-block",
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

export function AuthCTAStatic({
  signedOutLabel = "Start Planning Today",
  signedOutSecondary,
  variant = "hero",
}: AuthCTAStaticProps) {
  const style = { ...buttonBase, ...variants[variant] };
  return (
    <>
      <Link href="/sign-up" className="auth-cta-btn" style={style}>
        {signedOutLabel}
      </Link>
      {signedOutSecondary}
    </>
  );
}
