import type { ReactNode } from "react";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalHeader } from "@/components/GlobalHeader";
import { PostHogProvider } from "@/components/PostHogProvider";

/**
 * App route-group layout — wraps everything behind auth (dashboard, sign-in,
 * sign-up, beta/claim). ClerkProvider lives here instead of the root layout
 * so marketing routes skip ~216 KiB of Clerk JS. PostHogProvider piggybacks
 * — it uses useUser() from Clerk for identified events, so it only needs to
 * be in the auth tree.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <Suspense fallback={null}>
        <PostHogProvider />
      </Suspense>
      <GlobalHeader />
      {children}
    </ClerkProvider>
  );
}
