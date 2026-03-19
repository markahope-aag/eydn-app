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
  { href: "/dashboard/chat", label: "Ask Eydn" },
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
      <aside className="w-64 border-r bg-white p-6 flex flex-col">
        <Link href="/dashboard" className="text-xl font-bold text-rose-600">
          Eydn
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              {item.label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/dashboard/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition mt-2"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto pt-6 border-t flex items-center gap-3">
          <UserButton />
          <NotificationBell />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
