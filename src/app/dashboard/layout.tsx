import { Suspense } from "react";
import dynamic from "next/dynamic";
import { isAdmin } from "@/lib/admin";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SkeletonList } from "@/components/Skeleton";

const ArchiveBanner = dynamic(() => import("@/components/ArchiveBanner"));
const DateSyncBanner = dynamic(() => import("@/components/DateSyncBanner").then((m) => ({ default: m.DateSyncBanner })));

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <DashboardSidebar admin={admin} />

      {/* Main content — add left padding on mobile for hamburger button */}
      <main id="main-content" className="flex-1 bg-whisper p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 overflow-x-hidden">
        <Suspense fallback={<SkeletonList count={5} />}>
          <ArchiveBanner />
          <DateSyncBanner />
          {children}
        </Suspense>
      </main>
    </div>
  );
}
