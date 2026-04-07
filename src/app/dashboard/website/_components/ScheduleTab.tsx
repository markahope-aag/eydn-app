"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type ScheduleItem = { time: string; event: string };
type FaqItem = { question: string; answer: string };

interface ScheduleTabProps {
  schedule: ScheduleItem[];
  setSchedule: (schedule: ScheduleItem[]) => void;
  travel: string;
  setTravel: (travel: string) => void;
  accommodations: string;
  setAccommodations: (accommodations: string) => void;
  faq: FaqItem[];
  setFaq: (faq: FaqItem[]) => void;
  autoSave: (fields: Record<string, unknown>, debounceMs?: number) => void;
}

export function ScheduleTab({
  schedule,
  setSchedule,
  travel,
  setTravel,
  accommodations,
  setAccommodations,
  faq,
  setFaq,
  autoSave,
}: ScheduleTabProps) {
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importItems, setImportItems] = useState<ScheduleItem[]>([]);

  async function importFromDayOfPlanner() {
    try {
      const res = await fetch("/api/day-of");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const timeline = data?.content?.timeline;
      if (!timeline || timeline.length === 0) {
        toast.error("Create a Day-of Plan first");
        return;
      }
      const mapped: ScheduleItem[] = timeline.map((item: { time: string; event: string }) => ({
        time: item.time,
        event: item.event,
      }));
      setImportItems(mapped);
      setImportConfirmOpen(true);
    } catch {
      toast.error("Create a Day-of Plan first");
    }
  }

  function confirmImport() {
    setSchedule(importItems);
    autoSave({ schedule: importItems }, 0);
    setImportConfirmOpen(false);
    setImportItems([]);
    toast.success("Schedule imported from Day-of Plan");
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-plum">Schedule</h3>
          <button
            onClick={importFromDayOfPlanner}
            className="btn-secondary btn-sm text-violet"
          >
            Import from Day-of Planner
          </button>
        </div>
        <div className="space-y-3">
          {schedule.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={item.time}
                onChange={(e) => {
                  const updated = [...schedule];
                  updated[i] = { ...updated[i], time: e.target.value };
                  setSchedule(updated);
                  autoSave({ schedule: updated }, 2000);
                }}
                placeholder="4:30 PM"
                className="w-32 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
              <input
                type="text"
                value={item.event}
                onChange={(e) => {
                  const updated = [...schedule];
                  updated[i] = { ...updated[i], event: e.target.value };
                  setSchedule(updated);
                  autoSave({ schedule: updated }, 2000);
                }}
                placeholder="Ceremony begins"
                className="flex-1 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
              <button
                onClick={() => {
                  const updated = schedule.filter((_, j) => j !== i);
                  setSchedule(updated);
                  autoSave({ schedule: updated }, 2000);
                }}
                className="btn-ghost btn-sm text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const updated = [...schedule, { time: "", event: "" }];
            setSchedule(updated);
          }}
          className="btn-ghost btn-sm mt-3 text-violet"
        >
          + Add Schedule Item
        </button>
      </div>

      <div>
        <label className="text-[13px] font-semibold text-muted block mb-1">
          Travel Info
        </label>
        <textarea
          value={travel}
          onChange={(e) => {
            setTravel(e.target.value);
            autoSave({ travel: e.target.value });
          }}
          placeholder="Airport info, driving directions, parking details..."
          rows={4}
          className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
        />
      </div>

      <div>
        <label className="text-[13px] font-semibold text-muted block mb-1">
          Accommodations
        </label>
        <textarea
          value={accommodations}
          onChange={(e) => {
            setAccommodations(e.target.value);
            autoSave({ accommodations: e.target.value });
          }}
          placeholder="Hotel blocks, nearby lodging options..."
          rows={4}
          className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
        />
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-plum mb-4">FAQ</h3>
        <div className="space-y-4">
          {faq.map((item, i) => (
            <div key={i} className="card p-4 space-y-2">
              <input
                type="text"
                value={item.question}
                onChange={(e) => {
                  const updated = [...faq];
                  updated[i] = { ...updated[i], question: e.target.value };
                  setFaq(updated);
                  autoSave({ faq: updated }, 2000);
                }}
                placeholder="Question"
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
              <textarea
                value={item.answer}
                onChange={(e) => {
                  const updated = [...faq];
                  updated[i] = { ...updated[i], answer: e.target.value };
                  setFaq(updated);
                  autoSave({ faq: updated }, 2000);
                }}
                placeholder="Answer"
                rows={2}
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
              />
              <button
                onClick={() => {
                  const updated = faq.filter((_, j) => j !== i);
                  setFaq(updated);
                  autoSave({ faq: updated }, 2000);
                }}
                className="btn-ghost btn-sm text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {faq.length === 0 && (
          <div className="mt-3">
            <p className="text-[12px] text-muted mb-2">Quick add a common question:</p>
            <div className="flex flex-wrap gap-2">
              {["Is there parking at the venue?", "What's the dress code?", "Are children welcome?"].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    const updated = [...faq, { question: q, answer: "" }];
                    setFaq(updated);
                    autoSave({ faq: updated }, 2000);
                  }}
                  className="rounded-full border border-violet/30 bg-lavender/50 px-3 py-1 text-[13px] text-violet hover:bg-lavender transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            const updated = [...faq, { question: "", answer: "" }];
            setFaq(updated);
          }}
          className="btn-ghost btn-sm mt-3 text-violet"
        >
          + Add FAQ
        </button>
      </div>

      {/* Import from Day-of Planner confirmation dialog */}
      <ConfirmDialog
        open={importConfirmOpen}
        onConfirm={confirmImport}
        onCancel={() => { setImportConfirmOpen(false); setImportItems([]); }}
        title="Import Schedule"
        message={`Import ${importItems.length} items from your Day-of Plan? This will replace your current schedule.`}
        confirmLabel="Import"
        destructive={false}
      />
    </div>
  );
}
