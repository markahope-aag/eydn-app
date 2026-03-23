"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

type GuideStatus = {
  guide_slug: string;
  section_index: number;
  completed: boolean;
  updated_at: string;
};

const GUIDE_CARDS = [
  { slug: "guest-list", title: "Guest List", subtitle: "Build your guest list with capacity planning and priority tiers", icon: "clipboard" },
  { slug: "colors-theme", title: "Colors & Theme", subtitle: "Define your wedding aesthetic, palette, and style references", icon: "palette" },
  { slug: "florist", title: "Florist", subtitle: "Plan ceremony, bridal party, and reception florals", icon: "flower" },
  { slug: "rentals", title: "Rentals", subtitle: "Tables, chairs, linens, tabletop, and extras", icon: "chair" },
  { slug: "wedding-dress", title: "Wedding Dress", subtitle: "Silhouette, details, and boutique preparation", icon: "sparkles" },
  { slug: "hair-makeup", title: "Hair & Makeup", subtitle: "Artist brief, getting-ready schedule, and trial planning", icon: "scissors" },
  { slug: "decor", title: "Decor", subtitle: "Ceremony and reception styling, lighting, and signage", icon: "lamp" },
  { slug: "music", title: "Music", subtitle: "Ceremony and reception music, song lists, and DJ brief", icon: "music" },
  { slug: "speeches", title: "Speeches", subtitle: "Speaker lineup, timing, tone, and day-of logistics", icon: "mic" },
  { slug: "insurance", title: "Insurance Guide", subtitle: "What to buy, when to buy it, and what to ask your vendors", icon: "shield", isStatic: true },
];

const ICONS: Record<string, string> = {
  clipboard: "\u{1F4CB}",
  palette: "\u{1F3A8}",
  flower: "\u{1F33A}",
  chair: "\u{1FA91}",
  sparkles: "\u2728",
  scissors: "\u2702\uFE0F",
  lamp: "\u{1F4A1}",
  music: "\u{1F3B5}",
  mic: "\u{1F3A4}",
  shield: "\u{1F6E1}\uFE0F",
};

export default function GuidesHubPage() {
  const [statuses, setStatuses] = useState<GuideStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guides")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStatuses)
      .catch(() => toast.error("Failed to load guides"))
      .finally(() => setLoading(false));
  }, []);

  const statusMap = new Map(statuses.map((s) => [s.guide_slug, s]));
  const completedCount = statuses.filter((s) => s.completed).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1>Planning Guides</h1>
          <p className="mt-1 text-[15px] text-muted">
            Step-by-step questionnaires to help you make decisions and brief your vendors.
          </p>
        </div>
        {completedCount > 0 && (
          <span className="text-[13px] font-semibold text-violet bg-lavender px-3 py-1 rounded-full">
            {completedCount}/{GUIDE_CARDS.length} complete
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[15px] text-muted py-8">Loading...</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_CARDS.map((card) => {
            const status = statusMap.get(card.slug);
            const isCompleted = status?.completed;
            const isStarted = status && !status.completed;
            const href = "isStatic" in card && card.isStatic
              ? `/dashboard/guides/insurance`
              : `/dashboard/guides/${card.slug}`;

            return (
              <Link
                key={card.slug}
                href={href}
                className="card p-5 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[24px]">{ICONS[card.icon] || ""}</span>
                  {isCompleted && (
                    <span className="badge-confirmed text-[11px]">Complete</span>
                  )}
                  {isStarted && (
                    <span className="badge-pending text-[11px]">In Progress</span>
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-plum group-hover:text-violet transition">
                  {card.title}
                </h3>
                <p className="mt-1 text-[13px] text-muted leading-relaxed">
                  {card.subtitle}
                </p>
                {"isStatic" in card && card.isStatic ? (
                  <p className="mt-3 text-[12px] font-semibold text-violet">Read Guide</p>
                ) : (
                  <p className="mt-3 text-[12px] font-semibold text-violet">
                    {isCompleted ? "Review" : isStarted ? "Continue" : "Start"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
