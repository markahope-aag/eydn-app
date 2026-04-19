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
}

export function TimelineTab({
  plan,
  timelineFilter,
  setTimelineFilter,
  updateTimeline,
  addTimelineItem,
  removeTimelineItem,
}: TimelineTabProps) {
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
        {plan.timeline
          .map((item, i) => ({ item, i }))
          .filter(({ item }) => {
            if (timelineFilter === "All") return true;
            const groups = (item.forGroup || "Everyone").split(",").map((g) => g.trim());
            return groups.includes(timelineFilter);
          })
          .map(({ item, i }) => {
          const assignedGroups = (item.forGroup || "Everyone").split(",").map((g) => g.trim());
          return (
          <div
            key={i}
            className="group/row rounded-[12px] border border-border bg-white overflow-hidden"
          >
            {/* Main row */}
            <div className="flex items-center gap-2 px-4 py-2">
              <input
                type="text"
                defaultValue={item.time}
                onBlur={(e) => updateTimeline(i, "time", e.target.value)}
                className="w-24 text-[15px] font-semibold text-violet border-0 bg-transparent flex-shrink-0"
                placeholder="Time"
              />
              <input
                type="text"
                defaultValue={item.event}
                onBlur={(e) => updateTimeline(i, "event", e.target.value)}
                className="flex-1 text-[15px] text-plum border-0 bg-transparent min-w-0"
                placeholder="Event name"
              />
              {item.duration ? (
                <span className="text-[11px] text-muted bg-lavender px-2 py-0.5 rounded-full flex-shrink-0">{item.duration}m</span>
              ) : null}
              <input
                type="number"
                defaultValue={item.duration || ""}
                onBlur={(e) => updateTimeline(i, "duration" as keyof TimelineItem, e.target.value)}
                placeholder="Min"
                min="0"
                className="w-14 text-[11px] text-muted border-0 bg-transparent text-right opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0"
                title="Duration (minutes)"
              />
              <button
                onClick={() => removeTimelineItem(i)}
                aria-label="Remove event"
                className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted hover:text-error flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
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
