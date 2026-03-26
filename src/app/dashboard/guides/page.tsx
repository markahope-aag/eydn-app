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
  { slug: "guest-list", title: "Guest List", subtitle: "Build your guest list with capacity planning and priority tiers", icon: "clipboard", time: "5 min", order: 1 },
  { slug: "colors-theme", title: "Colors & Theme", subtitle: "Define your wedding aesthetic, palette, and style references", icon: "palette", time: "10 min", order: 2 },
  { slug: "florist", title: "Florist", subtitle: "Plan ceremony, wedding party, and reception florals", icon: "flower", time: "10 min", order: 4 },
  { slug: "rentals", title: "Rentals", subtitle: "Tables, chairs, linens, tabletop, and extras", icon: "chair", time: "8 min", order: 6 },
  { slug: "wedding-dress", title: "Wedding Dress", subtitle: "Silhouette, details, and boutique preparation", icon: "sparkles", time: "5 min", order: 3 },
  { slug: "hair-makeup", title: "Hair & Makeup", subtitle: "Artist brief, getting-ready schedule, and trial planning", icon: "scissors", time: "5 min", order: 5 },
  { slug: "decor", title: "Decor", subtitle: "Ceremony and reception styling, lighting, and signage", icon: "lamp", time: "8 min", order: 7 },
  { slug: "music", title: "Music", subtitle: "Ceremony and reception music, song lists, and DJ brief", icon: "music", time: "5 min", order: 8 },
  { slug: "speeches", title: "Speeches", subtitle: "Speaker lineup, timing, tone, and day-of logistics", icon: "mic", time: "5 min", order: 9 },
  { slug: "insurance", title: "Insurance Guide", subtitle: "What to buy, when to buy it, and what to ask your vendors", icon: "shield", time: "3 min", order: 10, isStatic: true },
];

function GuideIcon({ name, className }: { name: string; className?: string }) {
  const cn = className || "w-6 h-6";
  const icons: Record<string, React.ReactNode> = {
    clipboard: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="2" width="8" height="4" rx="1" /><rect x="4" y="4" width="16" height="18" rx="2" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" />
      </svg>
    ),
    palette: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="8" r="1.5" fill="currentColor" /><circle cx="8" cy="12" r="1.5" fill="currentColor" /><circle cx="16" cy="12" r="1.5" fill="currentColor" /><circle cx="10" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
    flower: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2C12 2 14.5 5.5 14.5 8.5C14.5 9.8 13.4 11 12 11C10.6 11 9.5 9.8 9.5 8.5C9.5 5.5 12 2 12 2Z" /><path d="M12 2C12 2 14.5 5.5 14.5 8.5C14.5 9.8 13.4 11 12 11C10.6 11 9.5 9.8 9.5 8.5C9.5 5.5 12 2 12 2Z" transform="rotate(72 12 12)" /><path d="M12 2C12 2 14.5 5.5 14.5 8.5C14.5 9.8 13.4 11 12 11C10.6 11 9.5 9.8 9.5 8.5C9.5 5.5 12 2 12 2Z" transform="rotate(144 12 12)" /><path d="M12 2C12 2 14.5 5.5 14.5 8.5C14.5 9.8 13.4 11 12 11C10.6 11 9.5 9.8 9.5 8.5C9.5 5.5 12 2 12 2Z" transform="rotate(216 12 12)" /><path d="M12 2C12 2 14.5 5.5 14.5 8.5C14.5 9.8 13.4 11 12 11C10.6 11 9.5 9.8 9.5 8.5C9.5 5.5 12 2 12 2Z" transform="rotate(288 12 12)" />
      </svg>
    ),
    chair: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10V4C6 2.89543 6.89543 2 8 2H16C17.1046 2 18 2.89543 18 4V10" /><rect x="4" y="10" width="16" height="4" rx="1" /><path d="M6 14V22M18 14V22M6 18H18" />
      </svg>
    ),
    sparkles: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" /><path d="M19 15L20 17.5L22 18L20 18.5L19 21L18 18.5L16 18L18 17.5L19 15Z" />
      </svg>
    ),
    scissors: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
    lamp: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18H15M10 22H14M12 2V3M4.22 4.22L4.93 4.93M1 12H3M21 12H23M19.07 4.93L19.78 4.22" /><path d="M17 12C17 9.24 14.76 7 12 7C9.24 7 7 9.24 7 12C7 14.05 8.23 15.79 10 16.58V18H14V16.58C15.77 15.79 17 14.05 17 12Z" />
      </svg>
    ),
    music: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5L21 3V16" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
    mic: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10C5 13.87 8.13 17 12 17C15.87 17 19 13.87 19 10" /><line x1="12" y1="17" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    ),
    shield: (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7V12C3 17.25 7.02 22.12 12 23C16.98 22.12 21 17.25 21 12V7L12 2Z" /><polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  };
  return <>{icons[name] || null}</>;
}

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
  const totalGuides = GUIDE_CARDS.length;
  const progressPct = totalGuides > 0 ? Math.round((completedCount / totalGuides) * 100) : 0;

  // Find the first not-started guide by recommended order
  const sortedByOrder = [...GUIDE_CARDS].sort((a, b) => a.order - b.order);
  const nextRecommended = sortedByOrder.find((card) => {
    const status = statusMap.get(card.slug);
    return !status || !status.completed;
  });

  return (
    <div>
      <div>
        <h1>Planning Guides</h1>
        <p className="mt-1 text-[15px] text-muted">
          Step-by-step questionnaires to help you make decisions and brief your vendors.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold text-plum">
            {completedCount}/{totalGuides} complete
          </span>
          <span className="text-[12px] text-muted">{progressPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--lavender, #F0E6FA)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100 ? "var(--success, #2E7D4F)" : "linear-gradient(90deg, var(--violet, #6B4C8A), var(--soft-violet, #C9A84C))",
            }}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-[15px] text-muted py-8">Loading...</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_CARDS.map((card) => {
            const status = statusMap.get(card.slug);
            const isCompleted = status?.completed;
            const isStarted = status && !status.completed;
            const isRecommendedNext = nextRecommended?.slug === card.slug && !isCompleted && !isStarted;
            const href = "isStatic" in card && card.isStatic
              ? `/dashboard/guides/insurance`
              : `/dashboard/guides/${card.slug}`;

            // CTA config per state
            let ctaLabel: string;
            let ctaColor: string;
            if ("isStatic" in card && card.isStatic) {
              ctaLabel = "Read Guide";
              ctaColor = "text-violet";
            } else if (isCompleted) {
              ctaLabel = "Review";
              ctaColor = "text-[#2E7D4F]";
            } else if (isStarted) {
              ctaLabel = "Continue";
              ctaColor = "text-[#C9A84C]";
            } else {
              ctaLabel = "Start";
              ctaColor = "text-violet";
            }

            return (
              <Link
                key={card.slug}
                href={href}
                className={`card p-5 hover:shadow-md transition group relative ${isRecommendedNext ? "ring-2 ring-violet/30" : ""}`}
              >
                {/* Recommended marker */}
                {isRecommendedNext && (
                  <span className="absolute -top-2.5 left-4 bg-violet text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                    Start here
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <span className="text-violet"><GuideIcon name={card.icon} /></span>
                  {isCompleted ? (
                    <span className="badge-confirmed text-[11px]">Complete</span>
                  ) : isStarted ? (
                    <span className="badge-pending text-[11px]">In Progress</span>
                  ) : (
                    <span className="bg-lavender text-muted text-[11px] font-semibold px-2 py-0.5 rounded-full">Not Started</span>
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-plum group-hover:text-violet transition">
                  {card.title}
                </h3>
                <p className="mt-1 text-[13px] text-muted leading-relaxed">
                  {card.subtitle}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[12px] font-semibold ${ctaColor}`}>
                    {ctaLabel} &rarr;
                  </span>
                  <span className="text-[11px] text-muted">~{card.time}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
