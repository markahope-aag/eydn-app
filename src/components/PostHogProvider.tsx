"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!key) return;
    if (posthog.__loaded) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: {
        dom_event_allowlist: ["click"],
      },
    });
  }, []);
  return null;
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || !posthog.__loaded) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function UserIdentifier() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || !posthog.__loaded) return;
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        created_at: user.createdAt,
      });
    }
  }, [isSignedIn, user]);

  return null;
}

export function PostHogProvider() {
  return (
    <>
      <PostHogInit />
      <PageviewTracker />
      <UserIdentifier />
    </>
  );
}
