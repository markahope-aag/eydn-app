"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { NotificationBell } from "@/components/NotificationBell";

const CommandPalette = lazy(() => import("@/components/CommandPalette").then((m) => ({ default: m.CommandPalette })));
const OnboardingTour = lazy(() => import("@/components/OnboardingTour").then((m) => ({ default: m.OnboardingTour })));

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/vendors", label: "Vendors" },
  { href: "/dashboard/budget", label: "Budget" },
  { href: "/dashboard/guests", label: "Guests" },
  { href: "/dashboard/wedding-party", label: "Wedding Party" },
  { href: "/dashboard/seating", label: "Seating Chart" },
  { href: "/dashboard/mood-board", label: "Vision Board" },
  { href: "/dashboard/guides", label: "Planning Guides" },
  { href: "/dashboard/day-of", label: "Day-of Planner" },
  { href: "/dashboard/rehearsal-dinner", label: "Rehearsal Dinner" },
  { href: "/dashboard/chat", label: "Ask Eydn" },
  { href: "/dashboard/vendor-portal", label: "Vendor Portal" },
  { href: "/dashboard/website", label: "Wedding Website" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/help", label: "Help & Support" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function DashboardSidebar({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      <Link
        href="/dashboard"
        className="flex items-center"
        onClick={() => setOpen(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="eydn" className="h-7" />
      </Link>
      <nav role="navigation" aria-label="Dashboard navigation" className="mt-8 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`rounded-[12px] px-3 py-2 text-[15px] transition ${
                active
                  ? "bg-lavender text-violet font-semibold"
                  : "font-normal text-muted hover:bg-lavender hover:text-violet"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {admin && (
          <>
            <Link
              href="/dashboard/admin"
              onClick={() => setOpen(false)}
              className={`rounded-[12px] px-3 py-2 text-[15px] font-semibold transition mt-2 ${
                isActive(pathname, "/dashboard/admin") &&
                !pathname.startsWith("/dashboard/admin/placements") &&
                !pathname.startsWith("/dashboard/admin/lifecycle")
                  ? "bg-lavender text-violet"
                  : "text-violet bg-lavender hover:bg-petal"
              }`}
            >
              Admin
            </Link>
            <Link
              href="/dashboard/admin/placements"
              onClick={() => setOpen(false)}
              className={`rounded-[12px] px-3 py-2 text-[13px] transition ${
                isActive(pathname, "/dashboard/admin/placements")
                  ? "bg-lavender text-violet font-semibold"
                  : "font-normal text-violet hover:bg-lavender"
              }`}
            >
              Placements
            </Link>
            <Link
              href="/dashboard/admin/blog"
              onClick={() => setOpen(false)}
              className={`rounded-[12px] px-3 py-2 text-[13px] transition ${
                isActive(pathname, "/dashboard/admin/blog")
                  ? "bg-lavender text-violet font-semibold"
                  : "font-normal text-violet hover:bg-lavender"
              }`}
            >
              Blog CMS
            </Link>
            <Link
              href="/dashboard/admin/lifecycle"
              onClick={() => setOpen(false)}
              className={`rounded-[12px] px-3 py-2 text-[13px] transition ${
                isActive(pathname, "/dashboard/admin/lifecycle")
                  ? "bg-lavender text-violet font-semibold"
                  : "font-normal text-violet hover:bg-lavender"
              }`}
            >
              Account Lifecycle
            </Link>
          </>
        )}
      </nav>
      <div className="mt-auto pt-6 border-t border-border flex items-center gap-3">
        <UserButton />
        <NotificationBell />
        <button
          type="button"
          onClick={() => {
            // Simulate Cmd+K to open the command palette
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                ctrlKey: true,
                bubbles: true,
              })
            );
          }}
          className="ml-auto rounded-[8px] bg-lavender px-2 py-1 text-[12px] font-medium text-muted hover:text-plum transition"
          title="Command palette"
        >
          &#x2318;K
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 rounded-[12px] bg-white border border-border p-2 shadow-sm"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-plum"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay sidebar */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Slide-over panel */}
          <aside className="absolute inset-y-0 left-0 w-64 bg-white p-6 flex flex-col shadow-xl animate-slide-in">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-muted hover:text-plum transition"
              aria-label="Close menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-white p-6 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Command Palette (global) */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>

      {/* Onboarding tour — only on dashboard overview */}
      {pathname === "/dashboard" && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}
    </>
  );
}
