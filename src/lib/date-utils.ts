/**
 * Format a due date with a friendly relative label.
 * Examples: "Sep 14, 2026 · 6 months away", "Mar 25, 2026 · 3 days away",
 *           "Mar 20, 2026 · 2 days ago", "Today"
 */
export function formatDueDate(dateStr: string): { formatted: string; relative: string; isOverdue: boolean; isToday: boolean } {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isOverdue = diffDays < 0;
  const isToday = diffDays === 0;

  let relative: string;
  if (isToday) {
    relative = "Today";
  } else if (diffDays === 1) {
    relative = "Tomorrow";
  } else if (diffDays === -1) {
    relative = "Yesterday";
  } else if (diffDays > 0 && diffDays < 7) {
    relative = `${diffDays} days away`;
  } else if (diffDays >= 7 && diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    relative = `${weeks} week${weeks > 1 ? "s" : ""} away`;
  } else if (diffDays >= 30 && diffDays < 365) {
    const months = Math.round(diffDays / 30.44);
    relative = `${months} month${months > 1 ? "s" : ""} away`;
  } else if (diffDays >= 365) {
    const years = Math.round(diffDays / 365);
    relative = `${years} year${years > 1 ? "s" : ""} away`;
  } else if (diffDays < 0 && diffDays > -7) {
    relative = `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} overdue`;
  } else if (diffDays <= -7 && diffDays > -30) {
    const weeks = Math.round(Math.abs(diffDays) / 7);
    relative = `${weeks} week${weeks > 1 ? "s" : ""} overdue`;
  } else {
    const months = Math.round(Math.abs(diffDays) / 30.44);
    relative = `${months} month${months > 1 ? "s" : ""} overdue`;
  }

  return { formatted, relative, isOverdue, isToday };
}
