"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { usePremium } from "@/components/PremiumGate";
import { DayOfPlan } from "./types";

interface AttireTabProps {
  plan: DayOfPlan;
  savePlan: (updated: DayOfPlan) => void;
}

// Inclusive groupings so attire can be sorted/filtered by who it's for —
// e.g. each partner, each partner's attendants, family, or other.
const ATTIRE_GROUPS = [
  "Partner 1",
  "Partner 2",
  "Partner 1's Party",
  "Partner 2's Party",
  "Family",
  "Other",
];

export function AttireTab({ plan, savePlan }: AttireTabProps) {
  const { isReadOnly, notifyReadOnly } = usePremium();
  const attirePhotoRef = useRef<HTMLInputElement>(null);
  const attirePhotoIndex = useRef<number | null>(null);
  const [filter, setFilter] = useState<string>("All");

  // Keep the original index so edits/deletes target the right entry even when
  // the visible list is filtered.
  const indexed = plan.attire.map((item, index) => ({ item, index }));
  const groupChips = ATTIRE_GROUPS.filter((g) => plan.attire.some((a) => a.group === g));
  const hasUnassigned = plan.attire.some((a) => !a.group);

  const visible = indexed.filter(({ item }) => {
    if (filter === "All") return true;
    if (filter === "Unassigned") return !item.group;
    return item.group === filter;
  });

  function countFor(g: string): number {
    if (g === "All") return plan.attire.length;
    if (g === "Unassigned") return plan.attire.filter((a) => !a.group).length;
    return plan.attire.filter((a) => a.group === g).length;
  }

  return (
    <div className="mt-4">
      <p className="text-[13px] text-muted mb-4">
        Document what each person is wearing. Add photos of outfits, accessories, and details.
      </p>

      {/* Filter by group once there's more than one entry to organize */}
      {plan.attire.length > 1 && (groupChips.length > 0 || hasUnassigned) && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {["All", ...groupChips, ...(hasUnassigned ? ["Unassigned"] : [])].map((g) => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-full whitespace-nowrap transition ${
                filter === g ? "bg-violet text-white" : "bg-lavender text-violet hover:bg-violet hover:text-white"
              }`}
            >
              {g} <span className="opacity-70">{countFor(g)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {visible.map(({ item, index: i }) => (
          <div key={`${plan.attire.length}-${i}`} className="card p-4 flex gap-4">
            {item.photoUrl ? (
              <div className="w-20 h-20 rounded-[12px] overflow-hidden flex-shrink-0 relative cursor-pointer group"
                onClick={() => {
                  if (isReadOnly) { notifyReadOnly(); return; }
                  attirePhotoIndex.current = i;
                  attirePhotoRef.current?.click();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.photoUrl} alt={item.person || "Attire"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="text-white text-[10px] font-semibold">Change</span>
                </div>
              </div>
            ) : (
              <button
                disabled={isReadOnly}
                onClick={() => {
                  if (isReadOnly) { notifyReadOnly(); return; }
                  attirePhotoIndex.current = i;
                  attirePhotoRef.current?.click();
                }}
                className="w-20 h-20 rounded-[12px] bg-lavender flex items-center justify-center flex-shrink-0 hover:bg-violet transition group disabled:opacity-50"
              >
                <span className="text-[24px] text-violet group-hover:text-white">+</span>
              </button>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  defaultValue={item.person}
                  onBlur={(e) => {
                    if (isReadOnly) { notifyReadOnly(); return; }
                    const updated = [...plan.attire];
                    updated[i] = { ...updated[i], person: e.target.value };
                    savePlan({ ...plan, attire: updated });
                  }}
                  placeholder="Person (e.g. Partner 1, Honor Attendant)"
                  className="flex-1 text-[15px] font-semibold text-plum border-0 bg-transparent"
                />
                <select
                  value={item.group || ""}
                  onChange={(e) => {
                    if (isReadOnly) { notifyReadOnly(); return; }
                    const updated = [...plan.attire];
                    updated[i] = { ...updated[i], group: e.target.value || undefined };
                    savePlan({ ...plan, attire: updated });
                  }}
                  aria-label="Attire group"
                  className="flex-shrink-0 text-[12px] font-semibold text-violet bg-lavender rounded-[8px] px-2 py-1 border-0"
                >
                  <option value="">Unassigned</option>
                  {ATTIRE_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <textarea
                defaultValue={item.description}
                onBlur={(e) => {
                  if (isReadOnly) { notifyReadOnly(); return; }
                  const updated = [...plan.attire];
                  updated[i] = { ...updated[i], description: e.target.value };
                  savePlan({ ...plan, attire: updated });
                }}
                placeholder="e.g. Ivory lace A-line gown, cathedral veil, pearl earrings, nude heels..."
                rows={2}
                className="w-full text-[13px] text-muted border-0 bg-transparent resize-none"
              />
            </div>
            <button
              disabled={isReadOnly}
              onClick={() => {
                if (isReadOnly) { notifyReadOnly(); return; }
                savePlan({ ...plan, attire: plan.attire.filter((_, j) => j !== i) });
              }}
              className="text-[10px] text-error hover:opacity-80 self-start disabled:opacity-50"
            >
              x
            </button>
          </div>
        ))}
      </div>
      <button
        disabled={isReadOnly}
        onClick={() => {
          if (isReadOnly) { notifyReadOnly(); return; }
          // New entries default to the active group filter so they show up where
          // you're working.
          const group = filter !== "All" && filter !== "Unassigned" ? filter : undefined;
          savePlan({ ...plan, attire: [...plan.attire, { person: "", description: "", photoUrl: null, group }] });
        }}
        className="btn-ghost btn-sm mt-3 disabled:opacity-50"
      >
        Add attire entry
      </button>
      <input
        ref={attirePhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async () => {
          if (isReadOnly) { notifyReadOnly(); return; }
          const file = attirePhotoRef.current?.files?.[0];
          const idx = attirePhotoIndex.current;
          if (!file || idx === null) return;

          const formData = new FormData();
          formData.append("file", file);
          formData.append("entity_type", "task");
          formData.append("entity_id", "wedding-party-photo");

          try {
            const res = await fetch("/api/attachments", { method: "POST", body: formData });
            if (!res.ok) throw new Error();
            // signed_url is a ready-to-display URL; file_url is the raw
            // storage path, which won't render in an <img> on its own.
            const { file_url, signed_url } = await res.json();
            const updated = [...plan.attire];
            updated[idx] = { ...updated[idx], photoUrl: signed_url || file_url };
            savePlan({ ...plan, attire: updated });
            toast.success("Photo saved");
          } catch {
            toast.error("Photo didn't upload. Try again.");
          }
          if (attirePhotoRef.current) attirePhotoRef.current.value = "";
        }}
      />
    </div>
  );
}
