import { describe, it, expect } from "vitest";
import {
  getWebsiteStage,
  getWebsiteStageInfo,
  getWebsiteProgress,
  type WebsiteContent,
  type WebsiteStage,
} from "./website-milestones";

const emptyContent: WebsiteContent = {
  enabled: false,
  headline: "",
  story: "",
  coverUrl: "",
  couplePhotoUrl: "",
  scheduleCount: 0,
  travel: "",
  accommodations: "",
  faqCount: 0,
  registryCount: 0,
  rsvpDeadline: "",
};

const fullContent: WebsiteContent = {
  enabled: true,
  headline: "We're getting married",
  story: "How we met...",
  coverUrl: "https://example.com/cover.jpg",
  couplePhotoUrl: "https://example.com/couple.jpg",
  scheduleCount: 3,
  travel: "Take the highway...",
  accommodations: "The Grand Hotel",
  faqCount: 4,
  registryCount: 2,
  rsvpDeadline: "2026-08-01",
};

describe("getWebsiteStage", () => {
  it("returns 'start' more than seven months out", () => {
    expect(getWebsiteStage(211)).toBe("start");
    expect(getWebsiteStage(400)).toBe("start");
  });

  it("returns 'build' roughly three to seven months out", () => {
    expect(getWebsiteStage(210)).toBe("build");
    expect(getWebsiteStage(99)).toBe("build");
    expect(getWebsiteStage(91)).toBe("build");
  });

  it("returns 'lock-in' roughly one to three months out", () => {
    expect(getWebsiteStage(90)).toBe("lock-in");
    expect(getWebsiteStage(31)).toBe("lock-in");
  });

  it("returns 'final' within the last month", () => {
    expect(getWebsiteStage(30)).toBe("final");
    expect(getWebsiteStage(1)).toBe("final");
  });

  it("returns 'after' on or past the wedding day", () => {
    expect(getWebsiteStage(0)).toBe("after");
    expect(getWebsiteStage(-10)).toBe("after");
  });

  it("falls back to 'build' when no date is set", () => {
    expect(getWebsiteStage(null)).toBe("build");
  });
});

describe("getWebsiteStageInfo", () => {
  it("returns a title and focus message for every stage", () => {
    const stages: WebsiteStage[] = ["start", "build", "lock-in", "final", "after"];
    for (const stage of stages) {
      const info = getWebsiteStageInfo(stage);
      expect(info.stage).toBe(stage);
      expect(info.title.length).toBeGreaterThan(0);
      expect(info.focus.length).toBeGreaterThan(0);
    }
  });
});

describe("getWebsiteProgress", () => {
  it("marks every section done for a fully filled-in site", () => {
    const progress = getWebsiteProgress(99, fullContent);
    expect(progress.isComplete).toBe(true);
    expect(progress.doneCount).toBe(progress.totalCount);
    expect(progress.outstanding).toHaveLength(0);
    expect(progress.overdueCount).toBe(0);
  });

  it("lists every section as outstanding for an empty site", () => {
    const progress = getWebsiteProgress(99, emptyContent);
    expect(progress.isComplete).toBe(false);
    expect(progress.doneCount).toBe(0);
    expect(progress.outstanding).toHaveLength(progress.totalCount);
  });

  it("flags nothing as overdue during the 'start' stage", () => {
    const progress = getWebsiteProgress(300, emptyContent);
    expect(progress.stage).toBe("start");
    expect(progress.overdueCount).toBe(0);
  });

  it("treats only the cover photo and story as overdue in the 'build' stage", () => {
    const progress = getWebsiteProgress(150, emptyContent);
    expect(progress.stage).toBe("build");
    const overdueKeys = progress.checklist
      .filter((item) => item.overdue)
      .map((item) => item.key)
      .sort();
    expect(overdueKeys).toEqual(["cover", "story"]);
  });

  it("flags every section overdue on an empty site late in the timeline", () => {
    const progress = getWebsiteProgress(20, emptyContent);
    expect(progress.stage).toBe("final");
    expect(progress.overdueCount).toBe(progress.totalCount);
    expect(progress.checklist.every((item) => item.overdue)).toBe(true);
  });

  it("counts partial progress correctly", () => {
    const progress = getWebsiteProgress(99, { ...emptyContent, story: "Our story", coverUrl: "x" });
    expect(progress.doneCount).toBe(2);
    expect(progress.isComplete).toBe(false);
  });

  it("does not count whitespace-only fields as done", () => {
    const progress = getWebsiteProgress(99, { ...emptyContent, story: "   " });
    expect(progress.doneCount).toBe(0);
  });

  it("includes the days-until value in the summary", () => {
    expect(getWebsiteProgress(42, emptyContent).daysUntil).toBe(42);
    expect(getWebsiteProgress(null, emptyContent).daysUntil).toBeNull();
  });
});
