"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { Tooltip } from "@/components/Tooltip";
import { escapeHtml } from "@/lib/validation";

type TimelineItem = { time: string; event: string };

type RehearsalGuest = { name: string; rsvp: "pending" | "accepted" | "declined" };

type RehearsalDinner = {
  id: string;
  wedding_id: string;
  venue: string | null;
  date: string | null;
  time: string | null;
  address: string | null;
  notes: string | null;
  hosted_by: string | null;
  dress_code: string | null;
  capacity: number | null;
  timeline: TimelineItem[];
  guest_list: RehearsalGuest[];
};

type WeddingGuest = { id: string; name: string };

const RSVP_BADGE: Record<string, string> = {
  pending: "badge-pending",
  accepted: "badge-confirmed",
  declined: "badge-declined",
};

const RSVP_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

function generateRehearsalTimeline(startTime: string): TimelineItem[] {
  // Parse HH:MM from date input
  const match = startTime.match(/^(\d{2}):(\d{2})$/);
  if (!match) return [];
  const startMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);

  function formatTime(totalMinutes: number): string {
    let h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const p = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, "0")} ${p}`;
  }

  return [
    { time: formatTime(startMinutes), event: "Guests arrive & cocktails" },
    { time: formatTime(startMinutes + 30), event: "Seated for dinner" },
    { time: formatTime(startMinutes + 45), event: "Welcome & toasts" },
    { time: formatTime(startMinutes + 60), event: "Dinner served" },
    { time: formatTime(startMinutes + 120), event: "Dessert & final toasts" },
    { time: formatTime(startMinutes + 150), event: "Evening wraps up" },
  ];
}

export default function RehearsalDinnerPage() {
  const [data, setData] = useState<RehearsalDinner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTimelineTime, setNewTimelineTime] = useState("");
  const [newTimelineEvent, setNewTimelineEvent] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [weddingGuests, setWeddingGuests] = useState<WeddingGuest[]>([]);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/rehearsal-dinner").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/guests").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/weddings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([rehearsalData, guestData, weddingData]) => {
        if (weddingData?.date) setWeddingDate(weddingData.date);
        // Migrate old string[] guest_list to RehearsalGuest[]
        if (rehearsalData.guest_list && rehearsalData.guest_list.length > 0) {
          const first = rehearsalData.guest_list[0];
          if (typeof first === "string") {
            rehearsalData.guest_list = (rehearsalData.guest_list as string[]).map(
              (name: string) => ({ name, rsvp: "pending" })
            );
          }
        }
        if (!rehearsalData.guest_list) rehearsalData.guest_list = [];
        setData(rehearsalData);
        setWeddingGuests(guestData);
      })
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
          hosted_by: updated.hosted_by,
          dress_code: updated.dress_code,
          capacity: updated.capacity,
          timeline: updated.timeline,
          guest_list: updated.guest_list,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      // Keep migrated guest_list format
      if (saved.guest_list && saved.guest_list.length > 0 && typeof saved.guest_list[0] === "string") {
        saved.guest_list = (saved.guest_list as string[]).map((name: string) => ({ name, rsvp: "pending" }));
      }
      setData(saved);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof RehearsalDinner, value: string | number | null) {
    if (!data) return;

    // Date sync warning
    if (field === "date" && value && weddingDate) {
      const rehearsalMs = new Date(value as string).getTime();
      const weddingMs = new Date(weddingDate).getTime();
      const daysDiff = Math.round((weddingMs - rehearsalMs) / (1000 * 60 * 60 * 24));
      if (daysDiff < 0) {
        setDateWarning("This date is after your wedding date — rehearsal dinners are typically the night before.");
      } else if (daysDiff === 0) {
        setDateWarning("This is the same day as your wedding. Rehearsal dinners are typically the night before.");
      } else if (daysDiff > 3) {
        setDateWarning(`This is ${daysDiff} days before your wedding. Most rehearsal dinners are 1-2 days before.`);
      } else {
        setDateWarning(null);
      }
    }

    save({ ...data, [field]: value });
  }

  function getDayBefore(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
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
    save({ ...data, timeline: data.timeline.filter((_, i) => i !== index) });
  }

  function generateTimeline() {
    if (!data?.time) {
      toast.error("Set a dinner time first");
      return;
    }
    const timeline = generateRehearsalTimeline(data.time);
    if (timeline.length === 0) {
      toast.error("Could not generate timeline from the time provided");
      return;
    }
    save({ ...data, timeline });
    toast.success("Suggested timeline generated");
  }

  function addGuest(name: string) {
    if (!data) return;
    if (data.guest_list.some((g) => g.name === name)) {
      toast("Already on the list");
      return;
    }
    save({ ...data, guest_list: [...data.guest_list, { name, rsvp: "pending" }] });
    setGuestSearch("");
    setShowGuestDropdown(false);
  }

  function updateGuestRsvp(index: number, rsvp: "pending" | "accepted" | "declined") {
    if (!data) return;
    const updated = [...data.guest_list];
    updated[index] = { ...updated[index], rsvp };
    save({ ...data, guest_list: updated });
  }

  function removeGuest(index: number) {
    if (!data) return;
    save({ ...data, guest_list: data.guest_list.filter((_, i) => i !== index) });
  }

  function printDinner() {
    if (!data) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const esc = escapeHtml;
    const timelineHtml = data.timeline.length > 0
      ? data.timeline.map((t) => `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #E8D5B7"><span style="font-weight:600;color:#2C3E2D;min-width:80px">${esc(t.time)}</span><span style="color:#1A1A2E">${esc(t.event)}</span></div>`).join("")
      : '<p style="color:#8E7A9E">No timeline items</p>';

    const guestHtml = data.guest_list.length > 0
      ? data.guest_list.map((g) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #E8D5B7"><span style="color:#1A1A2E">${esc(g.name)}</span><span style="color:#8E7A9E;font-size:12px">${esc(RSVP_LABELS[g.rsvp] || g.rsvp)}</span></div>`).join("")
      : '<p style="color:#8E7A9E">No guests</p>';

    printWin.document.write(`<!DOCTYPE html><html><head><title>Rehearsal Dinner</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#1A1A2E}@media print{body{padding:20px}}</style></head><body>
      <h1 style="font-size:24px;margin-bottom:4px">Rehearsal Dinner</h1>
      ${data.hosted_by ? `<p style="color:#8E7A9E;font-size:14px">Hosted by ${esc(data.hosted_by)}</p>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:14px">
        ${data.venue ? `<div><strong>Venue:</strong> ${esc(data.venue)}</div>` : ""}
        ${data.date ? `<div><strong>Date:</strong> ${esc(data.date)}</div>` : ""}
        ${data.time ? `<div><strong>Time:</strong> ${esc(data.time)}</div>` : ""}
        ${data.address ? `<div><strong>Address:</strong> ${esc(data.address)}</div>` : ""}
        ${data.dress_code ? `<div><strong>Dress Code:</strong> ${esc(data.dress_code)}</div>` : ""}
      </div>
      ${data.notes ? `<p style="font-size:13px;color:#6B6B6B;margin:16px 0">${esc(data.notes)}</p>` : ""}
      <h2 style="font-size:16px;margin-top:24px;color:#2C3E2D">Timeline</h2>${timelineHtml}
      <h2 style="font-size:16px;margin-top:24px;color:#2C3E2D">Guests (${data.guest_list.length}${data.capacity ? ` / ${data.capacity}` : ""})</h2>${guestHtml}
      <p style="text-align:center;color:#8E7A9E;font-size:11px;margin-top:32px">Generated by eydn.app</p>
    </body></html>`);
    printWin.document.close();
    printWin.print();
  }

  if (loading) return <SkeletonList count={4} />;

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] text-muted">Failed to load rehearsal dinner details.</p>
      </div>
    );
  }

  // Guest list stats
  const acceptedCount = data.guest_list.filter((g) => g.rsvp === "accepted").length;
  const declinedCount = data.guest_list.filter((g) => g.rsvp === "declined").length;
  const pendingCount = data.guest_list.filter((g) => g.rsvp === "pending").length;

  // Filter wedding guests for lookup dropdown
  const alreadyAdded = new Set(data.guest_list.map((g) => g.name));
  const filteredWeddingGuests = weddingGuests.filter(
    (g) => !alreadyAdded.has(g.name) && (!guestSearch || g.name.toLowerCase().includes(guestSearch.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1>Rehearsal Dinner</h1>
          <p className="mt-1 text-[15px] text-muted">
            Plan your rehearsal dinner details
            {saving && <span className="ml-2 text-violet">Saving...</span>}
          </p>
        </div>
        <button onClick={printDinner} className="btn-secondary btn-sm inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6V1H12V6M4 12H2.5C1.67157 12 1 11.3284 1 10.5V7.5C1 6.67157 1.67157 6 2.5 6H13.5C14.3284 6 15 6.67157 15 7.5V10.5C15 11.3284 14.3284 12 13.5 12H12M4 9H12V15H4V9Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Print
        </button>
      </div>

      {/* Venue details */}
      <div className="mt-6 card p-5 space-y-4">
        <h2 className="text-[16px] font-semibold text-plum">Venue Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <label className="text-[12px] font-semibold text-muted">Date <Tooltip text="This date is automatically set to the night before your wedding when your wedding date changes. You can override it, but we'll warn you if it seems off." /></label>
            <input
              type="date"
              defaultValue={data.date || ""}
              onChange={(e) => updateField("date", e.target.value || null)}
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
            {dateWarning && (
              <p className="text-[11px] text-amber-600 mt-1">{dateWarning}</p>
            )}
            {!data.date && weddingDate && (
              <button
                type="button"
                onClick={() => updateField("date", getDayBefore(weddingDate))}
                className="text-[11px] text-violet hover:text-plum mt-1"
              >
                Set to night before wedding ({new Date(getDayBefore(weddingDate) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })})
              </button>
            )}
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Start Time <Tooltip text="Set your dinner start time to generate a suggested timeline. You can customize it after." /></label>
            <input
              type="time"
              defaultValue={data.time || ""}
              onChange={(e) => updateField("time", e.target.value || null)}
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
          <div>
            <label className="text-[12px] font-semibold text-muted">Hosted By <Tooltip text="Traditionally hosted by the parents of one partner, but anyone can host. This appears on the printed version." /></label>
            <input
              type="text"
              defaultValue={data.hosted_by || ""}
              onBlur={(e) => updateField("hosted_by", e.target.value || null)}
              placeholder="e.g. Parents of Partner 1"
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Dress Code <Tooltip text="Share this with your guests so they know what to wear. Common options: smart casual, cocktail, semi-formal." /></label>
            <input
              type="text"
              defaultValue={data.dress_code || ""}
              onBlur={(e) => updateField("dress_code", e.target.value || null)}
              placeholder="e.g. Smart casual, Cocktail attire"
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
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-plum">Timeline</h2>
          {data.timeline.length === 0 && data.time && (
            <button onClick={generateTimeline} className="btn-primary btn-sm">
              Generate Suggested Timeline
            </button>
          )}
        </div>
        {data.timeline.length > 0 ? (
          <div className="space-y-1.5">
            {data.timeline.map((item, i) => (
              <div key={i} className="group/row flex items-center gap-3 rounded-[10px] bg-lavender/30 px-3 py-2">
                <span className="text-[14px] font-semibold text-violet min-w-[80px]">{item.time}</span>
                <span className="text-[14px] text-plum flex-1">{item.event}</span>
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
            ))}
            {data.time && (
              <button onClick={generateTimeline} className="text-[12px] text-muted hover:text-violet transition mt-1">
                Regenerate suggested timeline
              </button>
            )}
          </div>
        ) : data.time ? (
          <div className="text-center py-6">
            <p className="text-[14px] text-muted mb-3">No timeline items yet</p>
            <button onClick={generateTimeline} className="btn-primary">
              Generate Suggested Timeline
            </button>
            <p className="text-[11px] text-muted mt-2">Creates a typical rehearsal dinner flow based on your {data.time} start time</p>
          </div>
        ) : (
          <p className="text-[14px] text-muted">Set a start time above to generate a suggested timeline.</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTimelineTime}
            onChange={(e) => setNewTimelineTime(e.target.value)}
            placeholder="e.g. 6:30 PM"
            className="w-full sm:w-[130px] rounded-[10px] border-border px-3 py-1.5 text-[14px]"
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
            className="btn-primary btn-sm disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {/* Guest List */}
      <div className="mt-6 card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-semibold text-plum">
              Guest List
            </h2>
            {data.guest_list.length > 0 && (
              <span className="text-[13px] text-muted">
                {data.guest_list.length}{data.capacity ? ` / ${data.capacity}` : ""} guests
                {data.capacity && data.guest_list.length > data.capacity && (
                  <span className="text-error ml-1 font-semibold">Over capacity</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted">Capacity: <Tooltip text="How many guests the venue can seat. We'll warn you if your guest list exceeds this." /></label>
            <input
              type="number"
              defaultValue={data.capacity || ""}
              onBlur={(e) => updateField("capacity", e.target.value ? Number(e.target.value) : null)}
              placeholder="—"
              min="0"
              className="w-16 rounded-[8px] border-border px-2 py-1 text-[13px] text-center"
            />
          </div>
        </div>

        {/* RSVP stats */}
        {data.guest_list.length > 0 && (
          <div className="flex gap-3 text-[13px]">
            <span className="badge-pending">Pending: {pendingCount}</span>
            <span className="badge-confirmed">Accepted: {acceptedCount}</span>
            <span className="badge-declined">Declined: {declinedCount}</span>
          </div>
        )}

        {/* Guest rows */}
        {data.guest_list.length > 0 ? (
          <div className="space-y-1">
            {data.guest_list.map((guest, i) => (
              <div
                key={i}
                className="group/guest flex items-center gap-3 rounded-[10px] bg-lavender/20 px-3 py-2"
              >
                <span className="text-[14px] text-plum font-medium flex-1">{guest.name}</span>
                <select
                  value={guest.rsvp}
                  onChange={(e) => updateGuestRsvp(i, e.target.value as "pending" | "accepted" | "declined")}
                  className={`rounded-full px-2 py-0.5 text-[12px] font-semibold border-0 cursor-pointer ${RSVP_BADGE[guest.rsvp] || ""}`}
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </select>
                <button
                  onClick={() => removeGuest(i)}
                  aria-label={`Remove ${guest.name}`}
                  className="opacity-0 group-hover/guest:opacity-100 transition-opacity text-muted hover:text-error"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted">No guests added yet. Search your guest list below.</p>
        )}

        {/* Guest lookup */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => { setGuestSearch(e.target.value); setShowGuestDropdown(true); }}
                onFocus={() => setShowGuestDropdown(true)}
                placeholder="Search your guest list..."
                className="w-full rounded-[10px] border-border px-3 py-1.5 text-[14px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && guestSearch.trim()) {
                    addGuest(guestSearch.trim());
                  }
                }}
              />
              {showGuestDropdown && guestSearch && filteredWeddingGuests.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowGuestDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-border rounded-[10px] shadow-lg max-h-48 overflow-y-auto">
                    {filteredWeddingGuests.slice(0, 10).map((g) => (
                      <button
                        key={g.id}
                        onClick={() => addGuest(g.name)}
                        className="w-full text-left px-3 py-2 text-[14px] text-plum hover:bg-lavender transition"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => { if (guestSearch.trim()) addGuest(guestSearch.trim()); }}
              disabled={!guestSearch.trim()}
              className="btn-primary btn-sm disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="text-[11px] text-muted mt-1">
            <Tooltip text="Type to search your wedding guest list, or enter a new name. Not everyone invited to the wedding attends the rehearsal, so this is tracked separately." wide />
            Search from your guest list or type a new name
          </p>
        </div>
      </div>
    </div>
  );
}
