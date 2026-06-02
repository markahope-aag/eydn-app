import { describe, it, expect } from "vitest";
import { findCronIssues, latestPerJob, type CronLogRow } from "./cron-health";

const NOW = Date.parse("2026-06-02T16:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function row(job: string, hoursOld: number, status = "success", error: string | null = null): CronLogRow {
  return { job_name: job, status, started_at: hoursAgo(hoursOld), error_message: error };
}

// A small expected map for focused tests.
const EXPECTED = { "daily-job": 26, "hourly-job": 3 };

describe("latestPerJob", () => {
  it("keeps the most recent row per job", () => {
    const rows = [row("daily-job", 30), row("daily-job", 2), row("hourly-job", 1)];
    const latest = latestPerJob(rows);
    expect(latest.get("daily-job")?.started_at).toBe(hoursAgo(2));
    expect(latest.size).toBe(2);
  });
});

describe("findCronIssues", () => {
  it("returns no issues when every job ran recently and succeeded", () => {
    const rows = [row("daily-job", 2), row("hourly-job", 1)];
    expect(findCronIssues(rows, NOW, EXPECTED)).toEqual([]);
  });

  it("flags a job that never ran", () => {
    const rows = [row("daily-job", 2)];
    const issues = findCronIssues(rows, NOW, EXPECTED);
    expect(issues.some((i) => i.startsWith("hourly-job: no run logged"))).toBe(true);
  });

  it("flags a stale job past its window", () => {
    const rows = [row("daily-job", 40), row("hourly-job", 1)];
    const issues = findCronIssues(rows, NOW, EXPECTED);
    expect(issues.some((i) => i.startsWith("daily-job: last ran"))).toBe(true);
  });

  it("flags a job whose latest run errored", () => {
    const rows = [row("daily-job", 2, "error", "boom"), row("hourly-job", 1)];
    const issues = findCronIssues(rows, NOW, EXPECTED);
    expect(issues).toContain("daily-job: last run errored — boom");
  });

  it("does not flag an old error once a newer success exists", () => {
    const rows = [
      row("daily-job", 2, "success"),
      row("daily-job", 5, "error", "old failure"),
      row("hourly-job", 1),
    ];
    expect(findCronIssues(rows, NOW, EXPECTED)).toEqual([]);
  });
});
