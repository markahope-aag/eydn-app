import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/guests", label: "Guests" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/budget", label: "Budget" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-6 flex flex-col">
        <Link href="/dashboard" className="text-xl font-bold text-rose-600">
          Wedding Planner
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
        </nav>
        <div className="mt-auto pt-6 border-t">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
