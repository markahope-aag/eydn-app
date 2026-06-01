/**
 * Shared timeline-phase metadata for the Tasks views. Kept in one place so the
 * task list and the dashboard header agree on phase order and labels.
 */

export const PHASE_ORDER: string[] = [
  "12 Months Before",
  "9-12 Months Before",
  "6-9 Months Before",
  "4-6 Months Before",
  "3-4 Months Before",
  "1-2 Months Before",
  "1 Week Before",
  "After the Wedding",
];

export const PHASE_LABELS: Record<string, { label: string; hint: string }> = {
  "12 Months Before": { label: "Start Here", hint: "Lock in your big-ticket vendors early" },
  "9-12 Months Before": { label: "Building Momentum", hint: "Book your creative team and set the tone" },
  "6-9 Months Before": { label: "Details Taking Shape", hint: "Invitations, attire, and decor decisions" },
  "4-6 Months Before": { label: "Getting Real", hint: "Finalize menus, music, and guest details" },
  "3-4 Months Before": { label: "Fine-Tuning", hint: "Fittings, beauty trials, and logistics" },
  "1-2 Months Before": { label: "Almost There", hint: "Confirm everything and tie up loose ends" },
  "1 Week Before": { label: "Final Countdown", hint: "Last checks before your big day" },
  "After the Wedding": { label: "After the I Do's", hint: "Thank-yous, name changes, and memories" },
  "Custom Tasks": { label: "Custom Tasks", hint: "Tasks you added yourself" },
};
