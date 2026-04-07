"use client";

import { Tooltip } from "@/components/Tooltip";
import { DayOfPlan, DEFAULT_MUSIC_MOMENTS } from "./types";

interface MusicTabProps {
  plan: DayOfPlan;
  savePlan: (updated: DayOfPlan) => void;
}

export function MusicTab({ plan, savePlan }: MusicTabProps) {
  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-[16px] border border-border bg-white">
        <table className="w-full text-[15px]">
          <thead className="border-b border-border bg-lavender">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-muted">Moment <Tooltip text="Each moment is a specific point during your wedding when music plays -- e.g. Processional (walking down the aisle), Recessional (walking back up), First Dance, etc." wide /></th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Song</th>
              <th className="px-4 py-2 text-left font-semibold text-muted">Artist</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plan.music.map((m, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={m.moment}
                    onBlur={(e) => {
                      const updated = [...plan.music];
                      updated[i] = { ...updated[i], moment: e.target.value };
                      savePlan({ ...plan, music: updated });
                    }}
                    className="w-full text-[15px] text-plum font-semibold border-0 bg-transparent"
                    placeholder="Moment"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={m.song}
                    onBlur={(e) => {
                      const updated = [...plan.music];
                      updated[i] = { ...updated[i], song: e.target.value };
                      savePlan({ ...plan, music: updated });
                    }}
                    className="w-full text-[15px] text-plum border-0 bg-transparent"
                    placeholder="Song name"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={m.artist}
                    onBlur={(e) => {
                      const updated = [...plan.music];
                      updated[i] = { ...updated[i], artist: e.target.value };
                      savePlan({ ...plan, music: updated });
                    }}
                    className="w-full text-[15px] text-muted border-0 bg-transparent"
                    placeholder="Artist"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() =>
                      savePlan({ ...plan, music: plan.music.filter((_, j) => j !== i) })
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
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            savePlan({
              ...plan,
              music: [...plan.music, { moment: "", song: "", artist: "" }],
            })
          }
          className="btn-ghost btn-sm"
        >
          Add row
        </button>
        {plan.music.length === 0 && (
          <button
            onClick={() =>
              savePlan({
                ...plan,
                music: DEFAULT_MUSIC_MOMENTS.map((moment) => ({
                  moment,
                  song: "",
                  artist: "",
                })),
              })
            }
            className="btn-secondary btn-sm"
          >
            Pre-fill common moments
          </button>
        )}
      </div>
    </div>
  );
}
