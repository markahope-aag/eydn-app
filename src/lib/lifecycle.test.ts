import { describe, it, expect } from "vitest";
import { calculatePhase, isReadOnly, getEmailsDue } from "./lifecycle";

/** Helper: return an ISO date string N months ago from "now". */
function monthsAgo(n: number): string {
  const d = new Date();
  d.setTime(d.getTime() - n * 30.44 * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

/** Helper: return an ISO date string N months in the future. */
function monthsFromNow(n: number): string {
  const d = new Date();
  d.setTime(d.getTime() + n * 30.44 * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

describe("calculatePhase", () => {
  it("returns 'active' when weddingDate is null", () => {
    expect(calculatePhase(null, false)).toBe("active");
  });

  it("returns 'active' for future wedding dates", () => {
    expect(calculatePhase(monthsFromNow(3), false)).toBe("active");
    expect(calculatePhase(monthsFromNow(12), false)).toBe("active");
  });

  it("returns 'post_wedding' for 0-12 months ago", () => {
    expect(calculatePhase(monthsAgo(0.5), false)).toBe("post_wedding");
    expect(calculatePhase(monthsAgo(6), false)).toBe("post_wedding");
    expect(calculatePhase(monthsAgo(11), false)).toBe("post_wedding");
  });

  it("returns 'archived' for 12-24 months ago", () => {
    expect(calculatePhase(monthsAgo(13), false)).toBe("archived");
    expect(calculatePhase(monthsAgo(18), false)).toBe("archived");
    expect(calculatePhase(monthsAgo(23), false)).toBe("archived");
  });

  it("returns 'archived' (not sunset) when memory plan is active even past 24 months", () => {
    expect(calculatePhase(monthsAgo(25), true)).toBe("archived");
    expect(calculatePhase(monthsAgo(36), true)).toBe("archived");
  });

  it("returns 'sunset' for 24+ months without memory plan", () => {
    expect(calculatePhase(monthsAgo(25), false)).toBe("sunset");
    expect(calculatePhase(monthsAgo(36), false)).toBe("sunset");
  });
});

describe("isReadOnly", () => {
  it("returns true for archived without memory plan", () => {
    expect(isReadOnly("archived", false)).toBe(true);
  });

  it("returns false for archived with memory plan", () => {
    expect(isReadOnly("archived", true)).toBe(false);
  });

  it("returns false for active phase", () => {
    expect(isReadOnly("active", false)).toBe(false);
  });

  it("returns false for post_wedding phase", () => {
    expect(isReadOnly("post_wedding", false)).toBe(false);
  });

  it("returns false for sunset phase", () => {
    expect(isReadOnly("sunset", false)).toBe(false);
  });
});

describe("getEmailsDue", () => {
  it("returns post_wedding_welcome right after wedding", () => {
    const due = getEmailsDue(monthsAgo(0.5), "post_wedding", []);
    expect(due).toContain("post_wedding_welcome");
    expect(due).not.toContain("download_reminder_3mo");
  });

  it("returns download reminders at 3, 6, 9 months", () => {
    const due3 = getEmailsDue(monthsAgo(3.5), "post_wedding", ["post_wedding_welcome"]);
    expect(due3).toContain("download_reminder_3mo");
    expect(due3).not.toContain("download_reminder_6mo");

    const due6 = getEmailsDue(monthsAgo(6.5), "post_wedding", [
      "post_wedding_welcome",
      "download_reminder_3mo",
    ]);
    expect(due6).toContain("download_reminder_6mo");
    expect(due6).not.toContain("download_reminder_9mo");

    const due9 = getEmailsDue(monthsAgo(9.5), "post_wedding", [
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
    ]);
    expect(due9).toContain("download_reminder_9mo");
  });

  it("returns memory_plan_offer at 11 months", () => {
    const due = getEmailsDue(monthsAgo(11.5), "post_wedding", [
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
      "download_reminder_9mo",
    ]);
    expect(due).toContain("memory_plan_offer");
  });

  it("returns archive_notice at 12 months", () => {
    const due = getEmailsDue(monthsAgo(12.5), "archived", [
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
      "download_reminder_9mo",
      "memory_plan_offer",
    ]);
    expect(due).toContain("archive_notice");
  });

  it("returns sunset warnings at 21 and 23.5 months", () => {
    const due21 = getEmailsDue(monthsAgo(21.5), "archived", [
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
      "download_reminder_9mo",
      "memory_plan_offer",
      "archive_notice",
    ]);
    expect(due21).toContain("sunset_warning_21mo");
    expect(due21).not.toContain("sunset_final");

    const due24 = getEmailsDue(monthsAgo(24), "sunset", [
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
      "download_reminder_9mo",
      "memory_plan_offer",
      "archive_notice",
      "sunset_warning_21mo",
    ]);
    expect(due24).toContain("sunset_final");
  });

  it("does not return emails that were already sent", () => {
    const due = getEmailsDue(monthsAgo(24), "sunset", [
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
      "download_reminder_9mo",
      "memory_plan_offer",
      "archive_notice",
      "sunset_warning_21mo",
      "sunset_final",
    ]);
    expect(due).toEqual([]);
  });

  it("returns all unsent emails if none were sent for old wedding", () => {
    const due = getEmailsDue(monthsAgo(24), "sunset", []);
    expect(due).toEqual([
      "post_wedding_welcome",
      "download_reminder_3mo",
      "download_reminder_6mo",
      "download_reminder_9mo",
      "memory_plan_offer",
      "archive_notice",
      "sunset_warning_21mo",
      "sunset_final",
    ]);
  });
});
