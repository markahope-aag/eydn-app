"use client";

import { Tooltip } from "@/components/Tooltip";
import { DayOfPlan, TimelineItem, TIMELINE_GROUPS } from "./types";

interface TimelineTabProps {
  plan: DayOfPlan;
  timelineFilter: string;
  setTimelineFilter: (filter: string) => void;
  updateTimeline: (index: number, field: keyof TimelineItem, value: string) => void;
  addTimelineItem: () => void;
  removeTimelineItem: (index: number) => void;
  moveTimelineItem: (indexA: number, indexB: number) => void;
}

export function TimelineTab({
  plan,
  timelineFilter,
  setTimelineFilter,
  updateTimeline,
  addTimelineItem,
  removeTimelineItem,
  moveTimelineItem,
}: TimelineTabProps) {
  // Rows visible under the current group filter, each carrying its index `i`
  // into the full plan.timeline array. Computed once so the up/down controls
  // can find a row's visible neighbours (and reorder against the real array
  // index) without re-deriving the filter inline.
  const visible = plan.timeline
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => {
      if (timelineFilter === "All") return true;
      const groups = (item.forGroup || "Everyone").split(",").map((g) => g.trim());
      return groups.includes(timelineFilter);
    });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-muted">Events scheduled around your ceremony time. <Tooltip text="Hair and makeup, photos, and arrival times count backwards. Reception events count forward. Durations help your coordinator keep things on track." wide /></p>
        <button onClick={addTimelineItem} className="btn-primary btn-sm">Add Event</button>
      </div>
      {/* Group filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {["All", ...TIMELINE_GROUPS].map((g) => (
          <button
            key={g}
            onClick={() => setTimelineFilter(g)}
            className={`px-3 py-1 text-[12px] font-semibold rounded-full whitespace-nowrap transition ${
              timelineFilter === g
                ? "bg-violet text-white"
                : "bg-lavender text-violet hover:bg-violet hover:text-white"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {visible.map(({ item, i }, pos) => {
          const assignedGroups = (item.forGroup || "Everyone").split(",").map((g) => g.trim());
          // Visible neighbours (array indices) for the up/down controls.
          // -1 means this row is first/last in the visible list.
          const prevIndex = pos > 0 ? visible[pos - 1].i : -1;
          const nextIndex = pos < visible.length - 1 ? visible[pos + 1].i : -1;
          return (
          <div
            // Key includes list length (so add/delete remounts neighbour rows
            // and uncontrolled inputs don't show the deleted row's text), the
            // ceremony time (so Regenerate Timeline remounts every row —
            // otherwise the new times sit in state but the inputs keep their
            // stale defaultValue), AND the row's own time/event so a manual
            // reorder (which swaps content but not the index) remounts the
            // affected rows instead of leaving stale defaultValue text behind.
            key={`${plan.ceremonyTime || "none"}-${plan.timeline.length}-${i}-${item.time}-${item.event}`}
            className="group/row rounded-[12px] border border-border bg-white overflow-hidden"
          >
            {/* Main row */}
            <div className="flex items-center gap-2 px-4 py-2">
              <input
                type="text"
                defaultValue={item.time}
                onBlur={(e) => updateTimeline(i, "time", e.target.value)}
                className="w-28 text-[15px] font-semibold text-violet border-0 bg-transparent flex-shrink-0"
                placeholder="Time"
              />
              <input
                type="text"
                defaultValue={item.event}
                onBlur={(e) => updateTimeline(i, "event", e.target.value)}
                className="flex-1 text-[15px] text-plum border-0 bg-transparent min-w-0"
                placeholder="Event name"
              />
              {/* Right cluster: duration display + on-hover edit + delete.
                  Showing the badge and the edit input at the same slot
                  (badge collapses when the input is shown on hover) keeps
                  the row width steady and stops the duration text from
                  getting clipped on narrower viewports. */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.duration ? (
                  <span className="text-[11px] text-muted bg-lavender px-2 py-0.5 rounded-full group-hover/row:hidden">
                    {item.duration}m
                  </span>
                ) : null}
                <input
                  type="number"
                  defaultValue={item.duration || ""}
                  onBlur={(e) => updateTimeline(i, "duration" as keyof TimelineItem, e.target.value)}
                  placeholder="Min"
                  min="0"
                  className="w-16 text-[11px] text-muted border-0 bg-transparent text-right opacity-0 group-hover/row:opacity-100 transition-opacity"
                  title="Duration (minutes)"
                />
                {/* Manual reorder. Disabled at the ends of the visible list. */}
                <div className="flex items-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveTimelineItem(i, prevIndex)}
                    disabled={prevIndex < 0}
                    aria-label="Move event up"
                    title="Move up"
                    className="text-muted hover:text-violet disabled:opacity-25 disabled:hover:text-muted p-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3.5 8.5L7 5L10.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTimelineItem(i, nextIndex)}
                    disabled={nextIndex < 0}
                    aria-label="Move event down"
                    title="Move down"
                    className="text-muted hover:text-violet disabled:opacity-25 disabled:hover:text-muted p-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3.5 5.5L7 9L10.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => removeTimelineItem(i)}
                  aria-label="Remove event"
                  className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted hover:text-error"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            {/* Expanded details row */}
            <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
              {/* Assignee chips */}
              <div className="flex gap-1 flex-wrap">
                {TIMELINE_GROUPS.map((g) => {
                  const active = assignedGroups.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        let newGroups: string[];
                        if (active) {
                          newGroups = assignedGroups.filter((ag) => ag !== g);
                          if (newGroups.length === 0) newGroups = ["Everyone"];
                        } else {
                          newGroups = [...assignedGroups.filter((ag) => ag !== "Everyone"), g];
                          if (g === "Everyone") newGroups = ["Everyone"];
                        }
                        updateTimeline(i, "forGroup", newGroups.join(","));
                      }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                        active
                          ? "bg-violet text-white"
                          : "bg-lavender/60 text-muted hover:bg-lavender"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              <span className="text-border">|</span>
              <input
                type="text"
                defaultValue={item.notes}
                onBlur={(e) => updateTimeline(i, "notes", e.target.value)}
                placeholder="Add location, vendor, or reminder"
                className="flex-1 text-[12px] text-muted border-0 bg-transparent min-w-[180px]"
              />
              {item.vendorCategory && (
                <span className="text-[10px] text-violet bg-lavender px-2 py-0.5 rounded-full flex-shrink-0">{item.vendorCategory}</span>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
