import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/MarketingHeader";

/**
 * Marketing route-group layout.
 *
 * No ClerkProvider, no PostHogProvider — those trees live in (app) so the
 * Clerk SDK (~216 KiB) doesn't load on public marketing pages. Pageview
 * analytics on marketing still fire via GTM in the root layout.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingHeader />
      {children}
    </>
  );
}
