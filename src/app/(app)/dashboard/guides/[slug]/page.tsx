"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GuideWizard } from "@/components/guides/GuideWizard";
import type { GuideDefinition } from "@/lib/guides/types";

export default function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [guide, setGuide] = useState<GuideDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(async ({ slug }) => {
      // Dynamic import to keep bundle small
      try {
        const { GUIDE_MAP } = await import("@/lib/guides/definitions");
        const def = GUIDE_MAP[slug];
        if (!def) {
          router.replace("/dashboard/guides");
          return;
        }
        setGuide(def);
      } catch {
        router.replace("/dashboard/guides");
      } finally {
        setLoading(false);
      }
    });
  }, [params, router]);

  if (loading || !guide) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push("/dashboard/guides")}
        className="text-[15px] text-muted hover:text-plum mb-4"
      >
        &larr; All Guides
      </button>
      <h1>{guide.title}</h1>
      <p className="mt-1 text-[15px] text-muted">{guide.subtitle}</p>
      <div className="mt-6">
        <GuideWizard guide={guide} />
      </div>
    </div>
  );
}
