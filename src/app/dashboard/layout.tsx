import { Suspense } from "react";
import dynamic from "next/dynamic";
import { isAdmin } from "@/lib/admin";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SkeletonList } from "@/components/Skeleton";

const ArchiveBanner = dynamic(() => import("@/components/ArchiveBanner"));

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
      <main id="main-content" className="flex-1 bg-whisper p-8 pt-16 md:pt-8">
        <Suspense fallback={<SkeletonList count={5} />}>
          <ArchiveBanner />
          {children}
        </Suspense>
      </main>
    </div>
  );
}
