"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";

/** Pages that have their own nav — hide the global header on these */
const PAGES_WITH_OWN_NAV = ["/", "/sign-in", "/sign-up", "/blog"];

export function GlobalHeader() {
  const pathname = usePathname();

  // Don't render on pages that have their own navigation
  if (PAGES_WITH_OWN_NAV.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Exception: /sign-in/[[...sign-in]] and /sign-up/[[...sign-up]] need to match
    if (pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/blog")) {
      return null;
    }
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white/95 backdrop-blur pl-16 lg:pl-6 pr-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="eydn" width={136} height={34} className="h-[34px] w-auto" />
        </Link>
        <Show when="signed-out">
          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/tools" className="text-[15px] text-muted hover:text-plum transition">Free Tools</Link>
            <Link href="/#features" className="text-[15px] text-muted hover:text-plum transition">Features</Link>
            <Link href="/#how-it-works" className="text-[15px] text-muted hover:text-plum transition">How It Works</Link>
            <Link href="/#pricing" className="text-[15px] text-muted hover:text-plum transition">Pricing</Link>
          </nav>
        </Show>
      </div>
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <Link href="/sign-in" className="btn-ghost btn-sm">Sign In</Link>
          <Link href="/sign-up" className="btn-primary btn-sm">Start Free Trial</Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="text-[15px] font-semibold text-violet hover:text-soft-violet transition"
          >
            Dashboard
          </Link>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
