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
    return <p className="text-sm text-gray-400 py-8">Loading...</p>;
  }

  if (!plan) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Day-of Planner</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your day-of plan will be auto-generated 2 weeks before the wedding.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Day-of Planner</h1>
      <p className="mt-1 text-sm text-gray-500">
        Your complete wedding day timeline. Click any field to edit.
      </p>

      {/* Timeline */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h2>
        <div className="space-y-1">
          {plan.timeline.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border bg-white px-4 py-2"
            >
              <input
                type="text"
                defaultValue={item.time}
                onBlur={(e) => updateTimeline(i, "time", e.target.value)}
                className="w-24 text-sm font-medium text-rose-600 border-0 bg-transparent"
              />
              <input
                type="text"
                defaultValue={item.event}
                onBlur={(e) => updateTimeline(i, "event", e.target.value)}
                className="flex-1 text-sm text-gray-900 border-0 bg-transparent"
              />
              <input
                type="text"
                defaultValue={item.notes}
                onBlur={(e) => updateTimeline(i, "notes", e.target.value)}
                placeholder="Notes"
                className="w-40 text-xs text-gray-500 border-0 bg-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Contacts */}
      {plan.vendorContacts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Vendor Contacts
          </h2>
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Vendor
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Category
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plan.vendorContacts.map((v, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {v.vendor}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{v.category}</td>
                    <td className="px-4 py-2 text-gray-700">{v.contact || "—"}</td>
                    <td className="px-4 py-2 text-gray-700">{v.phone || "—"}</td>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Wedding Party Jobs
          </h2>
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Job
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plan.partyAssignments.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{p.role}</td>
                    <td className="px-4 py-2 text-gray-700">{p.job || "—"}</td>
                    <td className="px-4 py-2 text-gray-700">{p.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Packing Checklist */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Packing Checklist
        </h2>
        <div className="space-y-1">
          {plan.packingChecklist.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checkedItems.has(item)}
                onChange={() => toggleCheckItem(item)}
                className="accent-rose-600"
              />
              <span
                className={`text-sm ${
                  checkedItems.has(item)
                    ? "text-gray-400 line-through"
                    : "text-gray-900"
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
