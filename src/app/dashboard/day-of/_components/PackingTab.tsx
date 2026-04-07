"use client";

import { Tooltip } from "@/components/Tooltip";
import { DayOfPlan } from "./types";

interface PackingTabProps {
  plan: DayOfPlan;
  checkedItems: Set<string>;
  toggleCheckItem: (item: string) => void;
  updatePackingNote: (index: number, notes: string) => void;
  removePackingItem: (index: number) => void;
  newPackingItem: string;
  setNewPackingItem: (value: string) => void;
  addPackingItem: () => void;
}

export function PackingTab({
  plan,
  checkedItems,
  toggleCheckItem,
  updatePackingNote,
  removePackingItem,
  newPackingItem,
  setNewPackingItem,
  addPackingItem,
}: PackingTabProps) {
  return (
    <div className="mt-4">
      <p className="text-[12px] text-muted mb-3">Check off items as you pack them. <Tooltip text="This checklist is included when you export the day-of PDF, so you can print it out for the wedding day." wide /></p>
      <div className="space-y-2">
        {plan.packingChecklist.map((p, i) => (
          <div
            key={i}
            className="card flex items-start gap-3 px-4 py-3"
          >
            <input
              type="checkbox"
              checked={checkedItems.has(p.item)}
              onChange={() => toggleCheckItem(p.item)}
              className="accent-violet mt-1 flex-shrink-0"
            />
            <div className="flex-1">
              <span
                className={`text-[15px] ${
                  checkedItems.has(p.item) ? "text-muted line-through" : "text-plum"
                }`}
              >
                {p.item}
              </span>
              <input
                type="text"
                defaultValue={p.notes}
                onBlur={(e) => updatePackingNote(i, e.target.value)}
                placeholder="Add a note..."
                className="block w-full mt-1 text-[12px] text-muted border-0 bg-transparent outline-none"
              />
            </div>
            <button
              onClick={() => removePackingItem(i)}
              className="text-[10px] text-error hover:opacity-80 flex-shrink-0 mt-1"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); addPackingItem(); }}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          value={newPackingItem}
          onChange={(e) => setNewPackingItem(e.target.value)}
          placeholder="Add an item..."
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px] flex-1"
        />
        <button type="submit" className="btn-secondary btn-sm">Add</button>
      </form>
    </div>
  );
}
