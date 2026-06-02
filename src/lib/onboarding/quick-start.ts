/**
 * Quick Start walk-through logic. Given a couple's current setup state, returns
 * the ordered getting-started steps with their done flags. The dashboard uses
 * this to show a simplified, one-step-at-a-time view for new couples.
 *
 * Pure and unit-tested — no data fetching here.
 */

export type QuickStartState = {
  hasDate: boolean;
  hasBudget: boolean;
  guestCount: number;
  vendorCount: number;
  doneTasks: number;
};

export type QuickStartStep = {
  key: string;
  label: string;
  description: string;
  cta: string;
  href: string;
  done: boolean;
};

/**
 * Build the getting-started checklist. Order is the recommended sequence; the
 * first step that isn't done is the couple's "next step".
 */
export function getQuickStartSteps(state: QuickStartState): QuickStartStep[] {
  return [
    {
      key: "date",
      label: "Set your wedding date",
      description:
        "Your whole timeline is built from this, so it's the best place to begin.",
      cta: "Set the date",
      href: "/dashboard/settings",
      done: state.hasDate,
    },
    {
      key: "budget",
      label: "Set your budget",
      description:
        "Tell us your total and we'll break it into categories to keep things on track.",
      cta: "Set a budget",
      href: "/dashboard/budget",
      done: state.hasBudget,
    },
    {
      key: "guests",
      label: "Start your guest list",
      description:
        "Add a few names to get going — you can always refine it later.",
      cta: "Add guests",
      href: "/dashboard/guests",
      done: state.guestCount > 0,
    },
    {
      key: "vendors",
      label: "Add your first vendor",
      description:
        "Start with your venue or photographer — the ones that book up earliest.",
      cta: "Add a vendor",
      href: "/dashboard/vendors",
      done: state.vendorCount > 0,
    },
    {
      key: "tasks",
      label: "Explore your tasks",
      description:
        "Your checklist is already built from your date. Tick off your first task.",
      cta: "View tasks",
      href: "/dashboard/tasks",
      done: state.doneTasks > 0,
    },
  ];
}

/** True when every getting-started step is complete. */
export function isQuickStartComplete(steps: QuickStartStep[]): boolean {
  return steps.every((s) => s.done);
}

/** The first incomplete step, or null when all are done. */
export function nextQuickStartStep(steps: QuickStartStep[]): QuickStartStep | null {
  return steps.find((s) => !s.done) ?? null;
}
