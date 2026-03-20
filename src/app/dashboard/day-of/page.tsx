"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type TimelineItem = { time: string; event: string; notes: string };
type VendorContact = { vendor: string; category: string; contact: string; phone: string };
type PartyAssignment = { name: string; role: string; job: string; phone: string };

type DayOfPlan = {
  timeline: TimelineItem[];
  vendorContacts: VendorContact[];
  partyAssignments: PartyAssignment[];
  packingChecklist: string[];
};

export default function DayOfPage() {
  const [plan, setPlan] = useState<DayOfPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/day-of")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setPlan(data.content as DayOfPlan);
      })
      .catch(() => toast.error("Failed to load day-of plan"))
      .finally(() => setLoading(false));
  }, []);

  async function updateTimeline(index: number, field: keyof TimelineItem, value: string) {
    if (!plan) return;
    const updated = [...plan.timeline];
    updated[index] = { ...updated[index], [field]: value };
    const newPlan = { ...plan, timeline: updated };
    setPlan(newPlan);

    await fetch("/api/day-of", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newPlan }),
    }).catch(() => toast.error("Failed to save"));
  }

  function toggleCheckItem(item: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (!plan) {
    return (
      <div>
        <h1>Day-of Planner</h1>
        <p className="mt-2 text-[15px] text-muted">
          Your day-of plan will be auto-generated 2 weeks before the wedding.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1>Day-of Planner</h1>
      <p className="mt-1 text-[15px] text-muted">
        Your complete wedding day timeline. Click any field to edit.
      </p>

      {/* Timeline */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-plum mb-3">Timeline</h2>
        <div className="space-y-1">
          {plan.timeline.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[12px] border-border bg-white px-4 py-2"
            >
              <input
                type="text"
                defaultValue={item.time}
                onBlur={(e) => updateTimeline(i, "time", e.target.value)}
                className="w-24 text-[15px] font-semibold text-violet border-0 bg-transparent"
              />
              <input
                type="text"
                defaultValue={item.event}
                onBlur={(e) => updateTimeline(i, "event", e.target.value)}
                className="flex-1 text-[15px] text-plum border-0 bg-transparent"
              />
              <input
                type="text"
                defaultValue={item.notes}
                onBlur={(e) => updateTimeline(i, "notes", e.target.value)}
                placeholder="Notes"
                className="w-40 text-[12px] text-muted border-0 bg-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Contacts */}
      {plan.vendorContacts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-plum mb-3">
            Vendor Contacts
          </h2>
          <div className="overflow-hidden rounded-[16px] border-border bg-white">
            <table className="w-full text-[15px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Vendor
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Category
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plan.vendorContacts.map((v, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-semibold text-plum">
                      {v.vendor}
                    </td>
                    <td className="px-4 py-2 text-muted">{v.category}</td>
                    <td className="px-4 py-2 text-muted">{v.contact || "—"}</td>
                    <td className="px-4 py-2 text-muted">{v.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wedding Party Assignments */}
      {plan.partyAssignments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-plum mb-3">
            Wedding Party Jobs
          </h2>
          <div className="overflow-hidden rounded-[16px] border-border bg-white">
            <table className="w-full text-[15px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Job
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plan.partyAssignments.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-semibold text-plum">
                      {p.name}
                    </td>
                    <td className="px-4 py-2 text-muted">{p.role}</td>
                    <td className="px-4 py-2 text-muted">{p.job || "—"}</td>
                    <td className="px-4 py-2 text-muted">{p.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Packing Checklist */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-plum mb-3">
          Packing Checklist
        </h2>
        <div className="space-y-1">
          {plan.packingChecklist.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 rounded-[12px] border-border bg-white px-4 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checkedItems.has(item)}
                onChange={() => toggleCheckItem(item)}
                className="accent-violet"
              />
              <span
                className={`text-[15px] ${
                  checkedItems.has(item)
                    ? "text-muted line-through"
                    : "text-plum"
                }`}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
