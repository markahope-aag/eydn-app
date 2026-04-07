import { describe, it, expect } from "vitest";
import { generateTimelineFromCeremony } from "./timeline-utils";

describe("generateTimelineFromCeremony", () => {
  it("returns empty array for invalid time string", () => {
    expect(generateTimelineFromCeremony("")).toEqual([]);
    expect(generateTimelineFromCeremony("not a time")).toEqual([]);
    expect(generateTimelineFromCeremony("25:00")).toEqual([]);
  });

  it("generates a timeline for a 4:00 PM ceremony", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    expect(timeline.length).toBeGreaterThan(0);

    // Find the ceremony event
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("4:00 PM");
    expect(ceremony!.forGroup).toBe("Everyone");
  });

  it("generates events before and after the ceremony", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    const ceremonyIdx = timeline.findIndex((item) => item.event === "Ceremony begins");
    expect(ceremonyIdx).toBeGreaterThan(0); // Events before ceremony exist
    expect(ceremonyIdx).toBeLessThan(timeline.length - 1); // Events after ceremony exist
  });

  it("includes hair & makeup as the first event", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    expect(timeline[0].event).toBe("Hair & makeup begins");
    expect(timeline[0].forGroup).toContain("Partner 1");
  });

  it("includes send-off as the last event", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    const lastEvent = timeline[timeline.length - 1];
    expect(lastEvent.event).toBe("Send-off");
    expect(lastEvent.forGroup).toBe("Everyone");
  });

  it("generates 18 timeline items", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");
    expect(timeline).toHaveLength(18);
  });

  it("includes key wedding events", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");
    const events = timeline.map((item) => item.event);

    expect(events).toContain("Hair & makeup begins");
    expect(events).toContain("Photographer arrives");
    expect(events).toContain("Getting ready photos");
    expect(events).toContain("Guests arrive");
    expect(events).toContain("Ceremony begins");
    expect(events).toContain("Cocktail hour");
    expect(events).toContain("First dance");
    expect(events).toContain("Dinner service");
    expect(events).toContain("Speeches & toasts");
    expect(events).toContain("Cake cutting");
    expect(events).toContain("Open dancing");
    expect(events).toContain("Last dance");
    expect(events).toContain("Send-off");
  });

  it("parses 12-hour time with space before meridiem", () => {
    const timeline = generateTimelineFromCeremony("2:30 PM");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("2:30 PM");
  });

  it("parses 12-hour time without space before meridiem", () => {
    const timeline = generateTimelineFromCeremony("2:30PM");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("2:30 PM");
  });

  it("parses lowercase meridiem", () => {
    const timeline = generateTimelineFromCeremony("4:00 pm");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("4:00 PM");
  });

  it("parses hour-only format like '4 PM'", () => {
    const timeline = generateTimelineFromCeremony("4 PM");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("4:00 PM");
  });

  it("parses hour-only format without space like '4PM'", () => {
    const timeline = generateTimelineFromCeremony("4PM");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("4:00 PM");
  });

  it("parses 24-hour format", () => {
    const timeline = generateTimelineFromCeremony("16:00");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("4:00 PM");
  });

  it("parses 24-hour morning time", () => {
    const timeline = generateTimelineFromCeremony("09:30");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("9:30 AM");
  });

  it("handles 12 PM (noon) correctly", () => {
    const timeline = generateTimelineFromCeremony("12:00 PM");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("12:00 PM");
  });

  it("handles 12 AM (midnight) correctly", () => {
    const timeline = generateTimelineFromCeremony("12:00 AM");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("12:00 AM");
  });

  it("assigns vendor categories to relevant events", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    const hairMakeup = timeline.find((item) => item.event === "Hair & makeup begins");
    expect(hairMakeup!.vendorCategory).toBe("Hair & Makeup");

    const photographer = timeline.find((item) => item.event === "Photographer arrives");
    expect(photographer!.vendorCategory).toBe("Photography");

    const cocktail = timeline.find((item) => item.event === "Cocktail hour");
    expect(cocktail!.vendorCategory).toBe("Catering");

    const firstDance = timeline.find((item) => item.event === "First dance");
    expect(firstDance!.vendorCategory).toBe("DJ / Band");
  });

  it("assigns duration to events", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony!.duration).toBe(30);

    const openDancing = timeline.find((item) => item.event === "Open dancing");
    expect(openDancing!.duration).toBe(120);

    const firstDance = timeline.find((item) => item.event === "First dance");
    expect(firstDance!.duration).toBe(5);
  });

  it("returns empty notes for all generated events", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    for (const item of timeline) {
      expect(item.notes).toBe("");
    }
  });

  it("events are in chronological order", () => {
    const timeline = generateTimelineFromCeremony("4:00 PM");

    // Parse the times back to compare order
    function timeToMinutes(timeStr: string): number {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
      if (!match) return -1;
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const p = match[3];
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return h * 60 + m;
    }

    for (let i = 1; i < timeline.length; i++) {
      const prev = timeToMinutes(timeline[i - 1].time);
      const curr = timeToMinutes(timeline[i].time);
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("rejects invalid 24-hour time (hour > 23)", () => {
    expect(generateTimelineFromCeremony("24:00")).toEqual([]);
  });

  it("rejects invalid 24-hour time (minute > 59)", () => {
    expect(generateTimelineFromCeremony("16:60")).toEqual([]);
  });

  it("trims whitespace from input", () => {
    const timeline = generateTimelineFromCeremony("  4:00 PM  ");
    const ceremony = timeline.find((item) => item.event === "Ceremony begins");
    expect(ceremony).toBeDefined();
    expect(ceremony!.time).toBe("4:00 PM");
  });
});
