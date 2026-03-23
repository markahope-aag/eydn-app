export type WeddingPhase = "active" | "post_wedding" | "archived" | "sunset";

/**
 * Calculate what phase a wedding should be in based on its date.
 * Returns null if no date is set (stays active).
 */
export function calculatePhase(weddingDate: string | null, memoryPlanActive: boolean): WeddingPhase {
  if (!weddingDate) return "active";

  const wedding = new Date(weddingDate);
  const now = new Date();
  const monthsSinceWedding = (now.getTime() - wedding.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (monthsSinceWedding < 0) return "active"; // Wedding hasn't happened yet
  if (monthsSinceWedding < 12) return "post_wedding";
  if (monthsSinceWedding < 24 || memoryPlanActive) return "archived";
  return "sunset";
}

/**
 * Check if a wedding is in read-only mode (archived without memory plan).
 */
export function isReadOnly(phase: WeddingPhase, memoryPlanActive: boolean): boolean {
  if (phase === "archived" && !memoryPlanActive) return true;
  return false;
}

/**
 * Determine which lifecycle emails should be sent for a wedding.
 */
export function getEmailsDue(
  weddingDate: string,
  currentPhase: WeddingPhase,
  alreadySent: string[]
): string[] {
  const wedding = new Date(weddingDate);
  const now = new Date();
  const monthsSince = (now.getTime() - wedding.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  const due: string[] = [];

  if (monthsSince >= 0 && !alreadySent.includes("post_wedding_welcome")) {
    due.push("post_wedding_welcome");
  }
  if (monthsSince >= 1 && !alreadySent.includes("download_reminder_1mo")) {
    due.push("download_reminder_1mo");
  }
  if (monthsSince >= 6 && !alreadySent.includes("download_reminder_6mo")) {
    due.push("download_reminder_6mo");
  }
  if (monthsSince >= 9 && !alreadySent.includes("download_reminder_9mo")) {
    due.push("download_reminder_9mo");
  }
  if (monthsSince >= 11 && !alreadySent.includes("memory_plan_offer")) {
    due.push("memory_plan_offer");
  }
  if (monthsSince >= 12 && !alreadySent.includes("archive_notice")) {
    due.push("archive_notice");
  }
  if (monthsSince >= 21 && !alreadySent.includes("sunset_warning_21mo")) {
    due.push("sunset_warning_21mo");
  }
  if (monthsSince >= 23.5 && !alreadySent.includes("sunset_final")) {
    due.push("sunset_final");
  }

  return due;
}
