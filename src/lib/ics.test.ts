import { describe, it, expect } from "vitest";
import { generateICSFeed, generateSingleEventICS } from "./ics";

type ICSTask = Parameters<typeof generateICSFeed>[0][number];

function createTask(overrides: Partial<ICSTask> = {}): ICSTask {
  return {
    id: "task-1",
    title: "Book Venue",
    description: null,
    due_date: "2026-09-15",
    status: "pending",
    priority: "medium",
    category: "Ceremony & Venue",
    edyn_message: null,
    notes: null,
    ...overrides,
  };
}

describe("generateICSFeed", () => {
  it("produces a valid VCALENDAR wrapper", () => {
    const output = generateICSFeed([createTask()], "Our Wedding");
    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).toContain("END:VCALENDAR");
    expect(output).toContain("VERSION:2.0");
    expect(output).toContain("CALSCALE:GREGORIAN");
    expect(output).toContain("METHOD:PUBLISH");
  });

  it("includes the calendar name", () => {
    const output = generateICSFeed([createTask()], "Alex & Jordan's Wedding");
    expect(output).toContain("X-WR-CALNAME:");
  });

  it("includes one VEVENT per task with a due_date", () => {
    const tasks = [
      createTask({ id: "t-1", title: "Book Venue", due_date: "2026-09-15" }),
      createTask({ id: "t-2", title: "Send Invites", due_date: "2026-07-01" }),
    ];
    const output = generateICSFeed(tasks, "My Calendar");

    const beginCount = (output.match(/BEGIN:VEVENT/g) || []).length;
    const endCount = (output.match(/END:VEVENT/g) || []).length;
    expect(beginCount).toBe(2);
    expect(endCount).toBe(2);
  });

  it("omits tasks with no due_date", () => {
    const tasks = [
      createTask({ id: "t-1", due_date: "2026-09-15" }),
      createTask({ id: "t-2", due_date: null }),
    ];
    const output = generateICSFeed(tasks, "My Calendar");

    const beginCount = (output.match(/BEGIN:VEVENT/g) || []).length;
    expect(beginCount).toBe(1);
    expect(output).toContain("t-1@eydn.app");
    expect(output).not.toContain("t-2@eydn.app");
  });

  it("returns empty calendar when no tasks have due dates", () => {
    const output = generateICSFeed(
      [createTask({ due_date: null })],
      "Empty Calendar"
    );
    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).not.toContain("BEGIN:VEVENT");
  });

  it("formats DTSTART as VALUE=DATE (YYYYMMDD)", () => {
    const output = generateICSFeed([createTask({ due_date: "2026-09-15" })], "Cal");
    expect(output).toContain("DTSTART;VALUE=DATE:20260915");
  });

  it("sets DTEND to the day after due_date", () => {
    const output = generateICSFeed([createTask({ due_date: "2026-09-15" })], "Cal");
    expect(output).toContain("DTEND;VALUE=DATE:20260916");
  });

  it("maps status 'done' to ICS STATUS:COMPLETED", () => {
    const output = generateICSFeed([createTask({ status: "done" })], "Cal");
    expect(output).toContain("STATUS:COMPLETED");
  });

  it("maps status 'in_progress' to ICS STATUS:IN-PROCESS", () => {
    const output = generateICSFeed([createTask({ status: "in_progress" })], "Cal");
    expect(output).toContain("STATUS:IN-PROCESS");
  });

  it("maps status 'pending' to ICS STATUS:NEEDS-ACTION", () => {
    const output = generateICSFeed([createTask({ status: "pending" })], "Cal");
    expect(output).toContain("STATUS:NEEDS-ACTION");
  });

  it("maps priority 'high' to PRIORITY:1", () => {
    const output = generateICSFeed([createTask({ priority: "high" })], "Cal");
    expect(output).toContain("PRIORITY:1");
  });

  it("maps priority 'low' to PRIORITY:9", () => {
    const output = generateICSFeed([createTask({ priority: "low" })], "Cal");
    expect(output).toContain("PRIORITY:9");
  });

  it("maps priority 'medium' to PRIORITY:5", () => {
    const output = generateICSFeed([createTask({ priority: "medium" })], "Cal");
    expect(output).toContain("PRIORITY:5");
  });

  it("includes CATEGORIES when category is set", () => {
    const output = generateICSFeed([createTask({ category: "Florals & Decor" })], "Cal");
    expect(output).toContain("CATEGORIES:");
  });

  it("omits CATEGORIES line when category is null", () => {
    const output = generateICSFeed([createTask({ category: null })], "Cal");
    expect(output).not.toContain("CATEGORIES:");
  });

  it("includes UID with @eydn.app suffix", () => {
    const output = generateICSFeed([createTask({ id: "task-abc" })], "Cal");
    expect(output).toContain("UID:task-abc@eydn.app");
  });

  it("escapes semicolons in title", () => {
    const output = generateICSFeed(
      [createTask({ title: "Meet; Plan; Celebrate" })],
      "Cal"
    );
    expect(output).toContain("SUMMARY:Meet\\; Plan\\; Celebrate");
  });

  it("escapes commas in title", () => {
    const output = generateICSFeed(
      [createTask({ title: "Cake, Flowers, Music" })],
      "Cal"
    );
    expect(output).toContain("SUMMARY:Cake\\, Flowers\\, Music");
  });

  it("includes notes in the DESCRIPTION field", () => {
    const output = generateICSFeed(
      [createTask({ notes: "Call vendor at noon" })],
      "Cal"
    );
    expect(output).toContain("Notes: Call vendor at noon");
  });

  it("ends with CRLF", () => {
    const output = generateICSFeed([createTask()], "Cal");
    expect(output.endsWith("\r\n")).toBe(true);
  });
});

describe("generateSingleEventICS", () => {
  it("generates a valid single-event calendar", () => {
    const output = generateSingleEventICS(createTask());
    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).toContain("END:VCALENDAR");
    expect(output).toContain("BEGIN:VEVENT");
    expect(output).toContain("END:VEVENT");
  });

  it("returns empty string when task has no due_date", () => {
    const output = generateSingleEventICS(createTask({ due_date: null }));
    expect(output).toBe("");
  });

  it("contains exactly one VEVENT block", () => {
    const output = generateSingleEventICS(createTask());
    const beginCount = (output.match(/BEGIN:VEVENT/g) || []).length;
    expect(beginCount).toBe(1);
  });

  it("includes the task title as SUMMARY", () => {
    const output = generateSingleEventICS(createTask({ title: "Final Fitting" }));
    expect(output).toContain("SUMMARY:Final Fitting");
  });
});
