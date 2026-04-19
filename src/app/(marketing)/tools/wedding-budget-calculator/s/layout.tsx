import type { Metadata } from "next";

// Share-link pages resolve a short_code and redirect to the calculator.
// No user-visible content — tell crawlers not to waste budget indexing them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SharedCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
