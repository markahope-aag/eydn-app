/**
 * ICS (iCalendar) generation utilities.
 * Generates RFC 5545-compliant VCALENDAR/VEVENT output.
 */

type ICSTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  category: string | null;
  edyn_message: string | null;
  notes: string | null;
};

/** Escape text values per RFC 5545 (backslash, semicolons, commas, newlines). */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Format a YYYY-MM-DD string as ICS VALUE=DATE (YYYYMMDD). */
function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/** Add one day to a YYYY-MM-DD string, return YYYYMMDD. */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Current UTC timestamp in ICS format. */
function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

/** Map task status to ICS STATUS value. */
function icsStatus(status: string): string {
  switch (status) {
    case "done": return "COMPLETED";
    case "in_progress": return "IN-PROCESS";
    default: return "NEEDS-ACTION";
  }
}

/** Map task priority to ICS PRIORITY (1=high, 5=medium, 9=low). */
function icsPriority(priority: string): string {
  switch (priority) {
    case "high": return "1";
    case "low": return "9";
    default: return "5";
  }
}

/** Build the DESCRIPTION field from task metadata. */
function buildDescription(task: ICSTask): string {
  const parts: string[] = [];
  if (task.edyn_message) parts.push(task.edyn_message);
  if (task.description) parts.push(task.description);
  if (task.notes) parts.push(`Notes: ${task.notes}`);
  parts.push(`Status: ${task.status.replace("_", " ")} | Priority: ${task.priority}`);
  return parts.join("\n\n");
}

/** Fold long lines per RFC 5545 (max 75 octets per line). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

function buildVEvent(task: ICSTask): string {
  if (!task.due_date) return "";

  const lines = [
    "BEGIN:VEVENT",
    `UID:${task.id}@eydn.app`,
    `DTSTAMP:${nowStamp()}`,
    `DTSTART;VALUE=DATE:${formatDate(task.due_date)}`,
    `DTEND;VALUE=DATE:${nextDay(task.due_date)}`,
    `SUMMARY:${escapeText(task.title)}`,
    `DESCRIPTION:${escapeText(buildDescription(task))}`,
    `STATUS:${icsStatus(task.status)}`,
    `PRIORITY:${icsPriority(task.priority)}`,
  ];

  if (task.category) {
    lines.push(`CATEGORIES:${escapeText(task.category)}`);
  }

  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

/** Generate a full ICS feed for multiple tasks. */
export function generateICSFeed(tasks: ICSTask[], calendarName: string): string {
  const events = tasks
    .filter((t) => t.due_date)
    .map(buildVEvent)
    .filter(Boolean);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eydn//Wedding Tasks//EN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}

/** Generate an ICS file for a single task. */
export function generateSingleEventICS(task: ICSTask): string {
  const event = buildVEvent(task);
  if (!event) return "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eydn//Wedding Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    event,
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
