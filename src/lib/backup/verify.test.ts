import { describe, it, expect } from "vitest";
import { assessBackup, type BackupMeta } from "./verify";

const healthy: BackupMeta = {
  ageHours: 2,
  bytes: 1_900_000,
  weddingCount: 16,
  liveWeddingCount: 16,
  hasWeddingsArray: true,
  firstWeddingHasData: true,
};

describe("assessBackup", () => {
  it("reports no problems for a healthy recent backup", () => {
    expect(assessBackup(healthy)).toEqual([]);
  });

  it("flags a stale backup", () => {
    const p = assessBackup({ ...healthy, ageHours: 30 });
    expect(p.some((x) => x.includes("old"))).toBe(true);
  });

  it("flags an unknown-age backup", () => {
    const p = assessBackup({ ...healthy, ageHours: null });
    expect(p.some((x) => x.includes("unknown age"))).toBe(true);
  });

  it("flags a suspiciously small backup", () => {
    const p = assessBackup({ ...healthy, bytes: 200 });
    expect(p.some((x) => x.includes("suspiciously small"))).toBe(true);
  });

  it("flags a missing weddings array", () => {
    const p = assessBackup({ ...healthy, hasWeddingsArray: false, weddingCount: null });
    expect(p.some((x) => x.includes("no weddings array"))).toBe(true);
  });

  it("flags a zero-wedding backup", () => {
    const p = assessBackup({ ...healthy, weddingCount: 0, firstWeddingHasData: true });
    expect(p.some((x) => x.includes("0 weddings"))).toBe(true);
  });

  it("flags a backup with fewer weddings than live", () => {
    const p = assessBackup({ ...healthy, weddingCount: 10, liveWeddingCount: 16 });
    expect(p.some((x) => x.includes("data may be missing"))).toBe(true);
  });

  it("does not flag a backup with MORE weddings than live (a delete happened)", () => {
    expect(assessBackup({ ...healthy, weddingCount: 20, liveWeddingCount: 16 })).toEqual([]);
  });

  it("flags weddings missing their data payload", () => {
    const p = assessBackup({ ...healthy, firstWeddingHasData: false });
    expect(p.some((x) => x.includes("missing their data payload"))).toBe(true);
  });
});
