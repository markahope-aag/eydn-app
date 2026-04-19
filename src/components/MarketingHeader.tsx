"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Clerk-free header used by non-homepage marketing pages (legal pages, etc.).
 * Pages that render their own nav (/, /blog, /tools) suppress this via the
 * same PAGES_WITH_OWN_NAV pattern GlobalHeader used originally.
 */
const PAGES_WITH_OWN_NAV = ["/", "/blog", "/tools"];

export function MarketingHeader() {
  const pathname = usePathname();
  if (PAGES_WITH_OWN_NAV.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white/95 backdrop-blur pl-16 lg:pl-6 pr-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="eydn" width={136} height={34} className="h-[34px] w-auto" />
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/tools" className="text-[15px] text-muted hover:text-plum transition">Free Tools</Link>
          <Link href="/#features" className="text-[15px] text-muted hover:text-plum transition">Features</Link>
          <Link href="/#how-it-works" className="text-[15px] text-muted hover:text-plum transition">How It Works</Link>
          <Link href="/#pricing" className="text-[15px] text-muted hover:text-plum transition">Pricing</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/sign-in" className="btn-ghost btn-sm">Sign In</Link>
        <Link href="/sign-up" className="btn-primary btn-sm">Start Free Trial</Link>
      </div>
    </header>
  );
}
