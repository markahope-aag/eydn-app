import { describe, it, expect } from "vitest";
import { selectBackupsToDelete } from "./retention";

const key = (d: string) => `backups/eydn-backup-${d}.json`;

describe("selectBackupsToDelete", () => {
  const ref = new Date(Date.UTC(2026, 5, 16)); // 2026-06-16

  it("keeps everything within the 30-day daily window", () => {
    const keys = [key("2026-06-16"), key("2026-06-01"), key("2026-05-18")];
    expect(selectBackupsToDelete(keys, { referenceDate: ref })).toEqual([]);
  });

  it("keeps one backup per month beyond the daily window for 12 months", () => {
    const keys = [
      key("2026-06-16"), // daily window → keep
      key("2026-04-28"), // April keeper
      key("2026-04-10"), // April dup → delete
      key("2026-03-15"), // March keeper
      key("2026-03-02"), // March dup → delete
    ];
    const del = selectBackupsToDelete(keys, { referenceDate: ref });
    expect(del.sort()).toEqual([key("2026-04-10"), key("2026-03-02")].sort());
  });

  it("deletes monthly backups older than the 12-month window", () => {
    const keys = [key("2026-06-16"), key("2025-06-01"), key("2025-05-01")];
    const del = selectBackupsToDelete(keys, { referenceDate: ref });
    // 12-month window starts 2025-07; both June'25 and May'25 fall outside.
    expect(del.sort()).toEqual([key("2025-05-01"), key("2025-06-01")].sort());
  });

  it("never deletes keys it cannot parse", () => {
    const keys = ["backups/manual-export.json", "sunset/abc-2026-01-01.json"];
    expect(selectBackupsToDelete(keys, { referenceDate: ref })).toEqual([]);
  });

  it("respects custom retention windows", () => {
    const keys = [key("2026-06-16"), key("2026-06-10"), key("2026-06-05")];
    const del = selectBackupsToDelete(keys, { referenceDate: ref, dailyDays: 7, monthlyMonths: 0 });
    // 7-day window keeps 06-16 and 06-10; 06-05 falls outside and monthly=0.
    expect(del).toEqual([key("2026-06-05")]);
  });
});
