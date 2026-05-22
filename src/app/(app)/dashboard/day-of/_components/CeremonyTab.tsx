"use client";

import { useState, useEffect } from "react";
import { Tooltip } from "@/components/Tooltip";
import { DayOfPlan } from "./types";

interface CeremonyTabProps {
  plan: DayOfPlan;
  savePlan: (updated: DayOfPlan) => void;
}

export function CeremonyTab({ plan, savePlan }: CeremonyTabProps) {
  // People already arranged in the ceremony seating layout — offered as
  // quick-add options for the processional order so names aren't retyped.
  const [layoutNames, setLayoutNames] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/ceremony")
      .then((r) => (r.ok ? r.json() : []))
      .then((positions: Array<{ person_name?: string }>) => {
        const names: string[] = [];
        for (const p of positions || []) {
          const n = (p.person_name || "").trim();
          if (n && !names.includes(n)) names.push(n);
        }
        setLayoutNames(names);
      })
      .catch(() => {});
  }, []);

  const availableFromLayout = layoutNames.filter(
    (n) => !plan.processionalOrder.includes(n)
  );

  return (
    <div className="mt-4 space-y-6">
      {/* Ceremony Script */}
      <div>
        <h2 className="text-[15px] font-semibold text-plum mb-2">Ceremony Script</h2>
        <textarea
          defaultValue={plan.ceremonyScript}
          onBlur={(e) => savePlan({ ...plan, ceremonyScript: e.target.value })}
          placeholder="Paste or write your ceremony script here..."
          rows={10}
          className="w-full rounded-[12px] border border-border bg-white px-4 py-3 text-[15px] text-plum resize-y"
        />
      </div>

      {/* Processional Order */}
      <div>
        <h2 className="text-[15px] font-semibold text-plum mb-2">Processional Order <Tooltip text="The order people walk down the aisle before the ceremony. Typically: officiant, grandparents, parents, wedding party (paired or single), ring bearer/flower girl, then the couple." wide /></h2>
        <p className="text-[12px] text-muted mb-3">Drag to reorder, or use the arrows. Names appear in order of entry.</p>

        {/* Quick-add from the ceremony seating layout */}
        {availableFromLayout.length > 0 && (
          <div className="mb-3 rounded-[12px] border border-border bg-lavender/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-muted">From your ceremony layout</p>
              <button
                onClick={() =>
                  savePlan({
                    ...plan,
                    processionalOrder: [...plan.processionalOrder, ...availableFromLayout],
                  })
                }
                className="text-[12px] font-semibold text-violet hover:text-soft-violet"
              >
                Add all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableFromLayout.map((name) => (
                <button
                  key={name}
                  onClick={() =>
                    savePlan({ ...plan, processionalOrder: [...plan.processionalOrder, name] })
                  }
                  className="rounded-full bg-white border border-border px-3 py-1 text-[12px] text-plum hover:border-violet hover:text-violet transition"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {plan.processionalOrder.map((name, i) => (
            <div
              // Key includes the list length so rows remount on add/delete,
              // otherwise a deleted row's text carries into the next row.
              key={`${plan.processionalOrder.length}-${i}`}
              className="flex items-center gap-2 rounded-[12px] border border-border bg-white px-4 py-2"
            >
              <span className="text-[13px] text-muted w-6 text-center">{i + 1}</span>
              <input
                type="text"
                defaultValue={name}
                onBlur={(e) => {
                  const updated = [...plan.processionalOrder];
                  updated[i] = e.target.value;
                  savePlan({ ...plan, processionalOrder: updated });
                }}
                className="flex-1 text-[15px] text-plum border-0 bg-transparent"
                placeholder="Name"
              />
              <button
                onClick={() => {
                  if (i === 0) return;
                  const updated = [...plan.processionalOrder];
                  [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                  savePlan({ ...plan, processionalOrder: updated });
                }}
                disabled={i === 0}
                className="text-[12px] text-muted hover:text-plum disabled:opacity-30"
              >
                &uarr;
              </button>
              <button
                onClick={() => {
                  if (i === plan.processionalOrder.length - 1) return;
                  const updated = [...plan.processionalOrder];
                  [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                  savePlan({ ...plan, processionalOrder: updated });
                }}
                disabled={i === plan.processionalOrder.length - 1}
                className="text-[12px] text-muted hover:text-plum disabled:opacity-30"
              >
                &darr;
              </button>
              <button
                onClick={() => {
                  savePlan({
                    ...plan,
                    processionalOrder: plan.processionalOrder.filter((_, j) => j !== i),
                  });
                }}
                className="text-[10px] text-error hover:opacity-80"
              >
                x
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            savePlan({ ...plan, processionalOrder: [...plan.processionalOrder, ""] })
          }
          className="btn-ghost btn-sm mt-3"
        >
          Add person
        </button>
      </div>

      {/* Officiant Notes */}
      <div>
        <h2 className="text-[15px] font-semibold text-plum mb-2">Officiant Notes</h2>
        <textarea
          defaultValue={plan.officiantNotes}
          onBlur={(e) => savePlan({ ...plan, officiantNotes: e.target.value })}
          placeholder="Notes for the officiant..."
          rows={5}
          className="w-full rounded-[12px] border border-border bg-white px-4 py-3 text-[15px] text-plum resize-y"
        />
      </div>
    </div>
  );
}
