"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { NotificationBell } from "@/components/NotificationBell";

const CommandPalette = lazy(() => import("@/components/CommandPalette").then((m) => ({ default: m.CommandPalette })));
const OnboardingTour = lazy(() => import("@/components/OnboardingTour").then((m) => ({ default: m.OnboardingTour })));

type NavItem = { href: string; label: string };
type NavSection = { label: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    label: "Planning",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/tasks", label: "Tasks" },
      { href: "/dashboard/budget", label: "Budget" },
      { href: "/dashboard/guides", label: "Planning Guides" },
      { href: "/dashboard/mood-board", label: "Vision Board" },
    ],
  },
  {
    label: "Vendors",
    items: [
      { href: "/dashboard/vendors", label: "Vendors" },
      { href: "/dashboard/vendor-portal", label: "Vendor Portal" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/guests", label: "Guests" },
      { href: "/dashboard/wedding-party", label: "Wedding Party" },
      { href: "/dashboard/seating", label: "Seating Chart" },
    ],
  },
  {
    label: "Day-Of",
    items: [
      { href: "/dashboard/day-of", label: "Day-of Planner" },
      { href: "/dashboard/rehearsal-dinner", label: "Rehearsal Dinner" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/website", label: "Wedding Website" },
      { href: "/dashboard/settings", label: "Settings" },
      { href: "/dashboard/help", label: "Help & Support" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function isSectionActive(pathname: string, section: NavSection) {
  return section.items.some((item) => isActive(pathname, item.href));
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`rounded-[12px] px-3 py-2 text-[15px] transition ${
        active
          ? "bg-lavender text-violet font-semibold"
          : "font-normal text-muted hover:bg-lavender hover:text-violet"
      }`}
    >
      {item.label}
    </Link>
  );
}

function CollapsibleSection({
  section,
  pathname,
  onLinkClick,
}: {
  section: NavSection;
  pathname: string;
  onLinkClick?: () => void;
}) {
  const hasActive = isSectionActive(pathname, section);
  const [open, setOpen] = useState(hasActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[15px] font-bold text-plum tracking-wide hover:text-plum transition"
      >
        {section.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onClick={onLinkClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardSidebar({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Logo — hidden on admin pages (already in site header) */}
      {!pathname.startsWith("/dashboard/admin") && (
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="eydn" className="h-7" />
        </Link>
      )}

      {/* Ask Eydn — pinned at top, hidden on admin pages */}
      {!pathname.startsWith("/dashboard/admin") && (
        <Link
          href="/dashboard/chat"
          onClick={() => setOpen(false)}
          className={`mt-6 flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[15px] font-semibold transition ${
            isActive(pathname, "/dashboard/chat")
              ? "bg-violet text-white"
              : "bg-brand-gradient text-white hover:opacity-90"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2H6.5L3 14V11H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="6" cy="6.5" r="0.75" fill="currentColor" />
            <circle cx="8" cy="6.5" r="0.75" fill="currentColor" />
            <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
          </svg>
          Ask Eydn
        </Link>
      )}

      <nav role="navigation" aria-label="Dashboard navigation" className={`${pathname.startsWith("/dashboard/admin") ? "mt-6" : "mt-4"} flex flex-col gap-3 overflow-y-auto`}>
        {/* Hide couple-facing nav when viewing admin pages */}
        {!pathname.startsWith("/dashboard/admin") && navSections.map((section) => (
          <CollapsibleSection
            key={section.label}
            section={section}
            pathname={pathname}
            onLinkClick={() => setOpen(false)}
          />
        ))}
        {admin && (
          <div>
            <p className="px-3 py-1.5 text-[15px] font-bold text-violet tracking-wide">
              Business
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <NavLink item={{ href: "/dashboard/admin?tab=overview", label: "Overview" }} active={pathname === "/dashboard/admin" && (!activeTab || activeTab === "overview")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin/analytics", label: "Analytics" }} active={isActive(pathname, "/dashboard/admin/analytics")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin?tab=subscribers", label: "Subscribers" }} active={pathname === "/dashboard/admin" && activeTab === "subscribers"} onClick={() => setOpen(false)} />
            </div>

            <p className="px-3 py-1.5 text-[15px] font-bold text-violet tracking-wide mt-3">
              Vendors
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <NavLink item={{ href: "/dashboard/admin/vendors", label: "Directory" }} active={isActive(pathname, "/dashboard/admin/vendors")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin/vendor-analytics", label: "Insights" }} active={isActive(pathname, "/dashboard/admin/vendor-analytics")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin/placements", label: "Placements" }} active={isActive(pathname, "/dashboard/admin/placements")} onClick={() => setOpen(false)} />
            </div>

            <p className="px-3 py-1.5 text-[15px] font-bold text-violet tracking-wide mt-3">
              Content & Growth
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <NavLink item={{ href: "/dashboard/admin/blog", label: "Blog CMS" }} active={isActive(pathname, "/dashboard/admin/blog")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin/promo-codes", label: "Promo Codes" }} active={isActive(pathname, "/dashboard/admin/promo-codes")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin/waitlist", label: "Waitlist" }} active={isActive(pathname, "/dashboard/admin/waitlist")} onClick={() => setOpen(false)} />
            </div>

            <p className="px-3 py-1.5 text-[15px] font-bold text-violet tracking-wide mt-3">
              Operations
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <NavLink item={{ href: "/dashboard/admin?tab=email", label: "Communications" }} active={pathname === "/dashboard/admin" && activeTab === "email"} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin?tab=cron-jobs", label: "Cron Jobs" }} active={pathname === "/dashboard/admin" && activeTab === "cron-jobs"} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin/lifecycle", label: "Account Lifecycle" }} active={isActive(pathname, "/dashboard/admin/lifecycle")} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin?tab=data-security", label: "Data & Security" }} active={pathname === "/dashboard/admin" && activeTab === "data-security"} onClick={() => setOpen(false)} />
              <NavLink item={{ href: "/dashboard/admin?tab=settings", label: "Settings" }} active={pathname === "/dashboard/admin" && activeTab === "settings"} onClick={() => setOpen(false)} />
            </div>
          </div>
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
