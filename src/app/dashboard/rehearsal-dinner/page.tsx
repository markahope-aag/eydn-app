"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";

type TimelineItem = { time: string; event: string };

type RehearsalDinner = {
  id: string;
  wedding_id: string;
  venue: string | null;
  date: string | null;
  time: string | null;
  address: string | null;
  notes: string | null;
  timeline: TimelineItem[];
  guest_list: string[];
};

export default function RehearsalDinnerPage() {
  const [data, setData] = useState<RehearsalDinner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTimelineTime, setNewTimelineTime] = useState("");
  const [newTimelineEvent, setNewTimelineEvent] = useState("");
  const [newGuest, setNewGuest] = useState("");

  useEffect(() => {
    fetch("/api/rehearsal-dinner")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => toast.error("Failed to load rehearsal dinner"))
      .finally(() => setLoading(false));
  }, []);

  async function save(updated: RehearsalDinner) {
    setData(updated);
    setSaving(true);
    try {
      const res = await fetch("/api/rehearsal-dinner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: updated.venue,
          date: updated.date,
          time: updated.time,
          address: updated.address,
          notes: updated.notes,
          timeline: updated.timeline,
          guest_list: updated.guest_list,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setData(saved);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof RehearsalDinner, value: string | null) {
    if (!data) return;
    save({ ...data, [field]: value });
  }

  function addTimelineItem() {
    if (!data || !newTimelineTime.trim() || !newTimelineEvent.trim()) return;
    const updated = {
      ...data,
      timeline: [...data.timeline, { time: newTimelineTime.trim(), event: newTimelineEvent.trim() }],
    };
    setNewTimelineTime("");
    setNewTimelineEvent("");
    save(updated);
  }

  function removeTimelineItem(index: number) {
    if (!data) return;
    const updated = {
      ...data,
      timeline: data.timeline.filter((_, i) => i !== index),
    };
    save(updated);
  }

  function addGuest() {
    if (!data || !newGuest.trim()) return;
    const updated = {
      ...data,
      guest_list: [...data.guest_list, newGuest.trim()],
    };
    setNewGuest("");
    save(updated);
  }

  function removeGuest(index: number) {
    if (!data) return;
    const updated = {
      ...data,
      guest_list: data.guest_list.filter((_, i) => i !== index),
    };
    save(updated);
  }

  if (loading) return <SkeletonList count={4} />;

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] text-muted">Failed to load rehearsal dinner details.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1>Rehearsal Dinner</h1>
          <p className="mt-1 text-[15px] text-muted">
            Plan your rehearsal dinner details
            {saving && <span className="ml-2 text-violet">Saving...</span>}
          </p>
        </div>
      </div>

      {/* Venue details */}
      <div className="mt-6 card p-5 space-y-4">
        <h2 className="text-[16px] font-semibold text-plum">Venue Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[12px] font-semibold text-muted">Venue Name</label>
            <input
              type="text"
              defaultValue={data.venue || ""}
              onBlur={(e) => updateField("venue", e.target.value || null)}
              placeholder="e.g. The Italian Restaurant"
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Date</label>
            <input
              type="text"
              defaultValue={data.date || ""}
              onBlur={(e) => updateField("date", e.target.value || null)}
              placeholder="e.g. Friday, June 14, 2026"
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Time</label>
            <input
              type="text"
              defaultValue={data.time || ""}
              onBlur={(e) => updateField("time", e.target.value || null)}
              placeholder="e.g. 6:30 PM"
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Address</label>
            <input
              type="text"
              defaultValue={data.address || ""}
              onBlur={(e) => updateField("address", e.target.value || null)}
              placeholder="e.g. 123 Main St, City, State"
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-muted">Notes</label>
          <textarea
            defaultValue={data.notes || ""}
            onBlur={(e) => updateField("notes", e.target.value || null)}
            placeholder="Menu selections, seating arrangements, special requests..."
            rows={3}
            className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-6 card p-5 space-y-4">
        <h2 className="text-[16px] font-semibold text-plum">Timeline</h2>
        {data.timeline.length > 0 ? (
          <div className="space-y-2">
            {data.timeline.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] bg-lavender/30 px-3 py-2">
                <span className="text-[14px] font-semibold text-violet min-w-[80px]">{item.time}</span>
                <span className="text-[14px] text-plum flex-1">{item.event}</span>
                <button
                  onClick={() => removeTimelineItem(i)}
                  className="text-[12px] text-error hover:opacity-80 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted">No timeline items yet.</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTimelineTime}
            onChange={(e) => setNewTimelineTime(e.target.value)}
            placeholder="Time (e.g. 6:30 PM)"
            className="w-[140px] rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          />
          <input
            type="text"
            value={newTimelineEvent}
            onChange={(e) => setNewTimelineEvent(e.target.value)}
            placeholder="Event (e.g. Guests arrive)"
            className="flex-1 rounded-[10px] border-border px-3 py-1.5 text-[14px]"
            onKeyDown={(e) => { if (e.key === "Enter") addTimelineItem(); }}
          />
          <button
            onClick={addTimelineItem}
            disabled={!newTimelineTime.trim() || !newTimelineEvent.trim()}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Guest List */}
      <div className="mt-6 card p-5 space-y-4">
        <h2 className="text-[16px] font-semibold text-plum">
          Guest List
          {data.guest_list.length > 0 && (
            <span className="ml-2 text-[13px] font-normal text-muted">{data.guest_list.length} guests</span>
          )}
        </h2>
        {data.guest_list.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.guest_list.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1"
              >
                <span className="text-[13px] font-semibold text-violet">{name}</span>
                <button
                  onClick={() => removeGuest(i)}
                  className="text-[12px] text-violet/50 hover:text-error transition"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted">No guests added yet.</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newGuest}
            onChange={(e) => setNewGuest(e.target.value)}
            placeholder="Guest name"
            className="flex-1 rounded-[10px] border-border px-3 py-1.5 text-[14px]"
            onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }}
          />
          <button
            onClick={addGuest}
            disabled={!newGuest.trim()}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
