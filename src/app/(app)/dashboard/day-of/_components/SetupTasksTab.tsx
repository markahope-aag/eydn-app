"use client";

import { DayOfPlan } from "./types";

interface SetupTasksTabProps {
  plan: DayOfPlan;
  savePlan: (updated: DayOfPlan) => void;
}

export function SetupTasksTab({ plan, savePlan }: SetupTasksTabProps) {
  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-[16px] border border-border bg-white">
        <table className="w-full text-[15px]">
          <thead className="border-b border-border bg-lavender">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-muted">What</th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Who</th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Notes</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plan.setupTasks.map((t, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={t.task}
                    onBlur={(e) => {
                      const updated = [...plan.setupTasks];
                      updated[i] = { ...updated[i], task: e.target.value };
                      savePlan({ ...plan, setupTasks: updated });
                    }}
                    className="w-full text-[15px] text-plum font-semibold border-0 bg-transparent"
                    placeholder="Task"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={t.assignedTo}
                    onBlur={(e) => {
                      const updated = [...plan.setupTasks];
                      updated[i] = { ...updated[i], assignedTo: e.target.value };
                      savePlan({ ...plan, setupTasks: updated });
                    }}
                    className="w-full text-[15px] text-muted border-0 bg-transparent"
                    placeholder="Assigned to"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={t.notes}
                    onBlur={(e) => {
                      const updated = [...plan.setupTasks];
                      updated[i] = { ...updated[i], notes: e.target.value };
                      savePlan({ ...plan, setupTasks: updated });
                    }}
                    className="w-full text-[15px] text-muted border-0 bg-transparent"
                    placeholder="Notes"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() =>
                      savePlan({
                        ...plan,
                        setupTasks: plan.setupTasks.filter((_, j) => j !== i),
                      })
                    }
                    className="text-[10px] text-error hover:opacity-80"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={() =>
          savePlan({
            ...plan,
            setupTasks: [...plan.setupTasks, { task: "", assignedTo: "", notes: "" }],
          })
        }
        className="btn-ghost btn-sm mt-3"
      >
        Add task
      </button>
    </div>
  );
}
