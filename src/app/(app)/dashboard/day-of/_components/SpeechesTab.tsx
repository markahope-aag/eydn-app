"use client";

import { DayOfPlan } from "./types";

interface SpeechesTabProps {
  plan: DayOfPlan;
  savePlan: (updated: DayOfPlan) => void;
}

export function SpeechesTab({ plan, savePlan }: SpeechesTabProps) {
  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-[16px] border border-border bg-white">
        <table className="w-full text-[15px]">
          <thead className="border-b border-border bg-lavender">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-muted w-8">#</th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Speaker</th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Role</th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Topic / Notes</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plan.speeches.map((s, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-muted text-[13px]">{i + 1}</td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={s.speaker}
                    onBlur={(e) => {
                      const updated = [...plan.speeches];
                      updated[i] = { ...updated[i], speaker: e.target.value };
                      savePlan({ ...plan, speeches: updated });
                    }}
                    className="w-full text-[15px] text-plum font-semibold border-0 bg-transparent"
                    placeholder="Name"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={s.role}
                    onBlur={(e) => {
                      const updated = [...plan.speeches];
                      updated[i] = { ...updated[i], role: e.target.value };
                      savePlan({ ...plan, speeches: updated });
                    }}
                    className="w-full text-[15px] text-muted border-0 bg-transparent"
                    placeholder="e.g. Honor Attendant"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={s.topic}
                    onBlur={(e) => {
                      const updated = [...plan.speeches];
                      updated[i] = { ...updated[i], topic: e.target.value };
                      savePlan({ ...plan, speeches: updated });
                    }}
                    className="w-full text-[15px] text-muted border-0 bg-transparent"
                    placeholder="Topic or notes"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() =>
                      savePlan({ ...plan, speeches: plan.speeches.filter((_, j) => j !== i) })
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
            speeches: [...plan.speeches, { speaker: "", role: "", topic: "" }],
          })
        }
        className="btn-ghost btn-sm mt-3"
      >
        Add speaker
      </button>
    </div>
  );
}
