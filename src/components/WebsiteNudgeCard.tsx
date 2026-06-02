import Link from "next/link";
import type { WebsiteProgressSummary } from "@/lib/website-milestones";

interface WebsiteNudgeCardProps {
  summary: WebsiteProgressSummary;
}

/**
 * Compact wedding-website progress nudge for the dashboard home.
 * Links through to the full builder.
 */
export function WebsiteNudgeCard({ summary }: WebsiteNudgeCardProps) {
  const { stageInfo, doneCount, totalCount, overdueCount } = summary;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Link
      href="/dashboard/website"
      className="group mt-8 block card p-5 hover:border-violet/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-plum">Wedding Website</h2>
          <p className="text-[13px] text-muted mt-0.5">{stageInfo.title}</p>
        </div>
        <span className="text-[13px] font-semibold text-violet whitespace-nowrap group-hover:text-soft-violet transition-colors">
          Open &rarr;
        </span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-lavender overflow-hidden">
        <div
          className="h-full rounded-full bg-violet transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[13px] text-muted">
        {doneCount} of {totalCount} sections ready
        {overdueCount > 0 && (
          <span className="font-semibold text-amber-700">
            {" "}
            &middot; {overdueCount} {overdueCount === 1 ? "needs" : "need"} attention
          </span>
        )}
      </p>
    </Link>
  );
}
