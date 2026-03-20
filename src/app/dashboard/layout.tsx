import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import { isAdmin } from "@/lib/admin";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/vendors", label: "Vendors" },
  { href: "/dashboard/budget", label: "Budget" },
  { href: "/dashboard/guests", label: "Guests" },
  { href: "/dashboard/wedding-party", label: "Wedding Party" },
  { href: "/dashboard/seating", label: "Seating Chart" },
  { href: "/dashboard/day-of", label: "Day-of Planner" },
  { href: "/dashboard/chat", label: "Ask eydn" },
  { href: "/dashboard/vendor-portal", label: "Vendor Portal" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-white p-6 flex flex-col">
        <Link href="/dashboard" className="text-xl font-semibold bg-brand-gradient bg-clip-text text-transparent">
          eydn
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[12px] px-3 py-2 text-[15px] font-normal text-muted hover:bg-lavender hover:text-violet transition"
            >
              {item.label}
            </Link>
          ))}
          {admin && (
            <>
              <Link
                href="/dashboard/admin"
                className="rounded-[12px] px-3 py-2 text-[15px] font-semibold text-violet bg-lavender hover:bg-petal transition mt-2"
              >
                Admin
              </Link>
              <Link
                href="/dashboard/admin/placements"
                className="rounded-[12px] px-3 py-2 text-[13px] font-normal text-violet hover:bg-lavender transition"
              >
                Placements
              </Link>
            </>
          )}
        </nav>
        <div className="mt-auto pt-6 border-t border-border flex items-center gap-3">
          <UserButton />
          <NotificationBell />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-whisper p-8">{children}</main>
    </div>
  );
}
