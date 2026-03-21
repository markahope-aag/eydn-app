import { isAdmin } from "@/lib/admin";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar admin={admin} />

      {/* Main content — add left padding on mobile for hamburger button */}
      <main className="flex-1 bg-whisper p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
