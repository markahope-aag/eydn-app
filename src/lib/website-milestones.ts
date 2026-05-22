/**
 * Wedding website milestone guidance.
 *
 * Given how far out the wedding is and what the couple has filled in,
 * this works out which stage of website-building they're in, what to
 * focus on now, and which sections still need attention.
 */

export type WebsiteStage = "start" | "build" | "lock-in" | "final" | "after";

export type WebsiteTab = "setup" | "schedule" | "registry" | "rsvp";

const STAGE_ORDER: Record<WebsiteStage, number> = {
  start: 0,
  build: 1,
  "lock-in": 2,
  final: 3,
  after: 4,
};

/**
 * Map days-until-wedding to a website-building stage. A missing date
 * falls back to "build" — the most content-heavy stage — so the couple
 * still gets the full checklist.
 */
export function getWebsiteStage(daysUntil: number | null): WebsiteStage {
  if (daysUntil === null) return "build";
  if (daysUntil <= 0) return "after";
  if (daysUntil <= 30) return "final";
  if (daysUntil <= 90) return "lock-in";
  if (daysUntil <= 210) return "build";
  return "start";
}

export type WebsiteStageInfo = {
  stage: WebsiteStage;
  title: string;
  focus: string;
};

const STAGE_INFO: Record<WebsiteStage, { title: string; focus: string }> = {
  start: {
    title: "Get your site started",
    focus:
      "Add the basics — a cover photo and your story — so you have a link ready to share with your save-the-dates.",
  },
  build: {
    title: "Build out your site",
    focus:
      "This is the big push. Your site should be complete before invitations go out, so fill in everything guests need — schedule, travel, where to stay, registry, RSVP — and publish it.",
  },
  "lock-in": {
    title: "Lock in the details",
    focus:
      "Firm up anything that was still up in the air — confirmed venue details, hotel room blocks, and exact ceremony and reception times.",
  },
  final: {
    title: "Final tighten",
    focus:
      "You're in the final stretch. Lock the schedule, add day-of logistics like parking and shuttle times, and a note on what to wear.",
  },
  after: {
    title: "After the celebration",
    focus:
      "Guests can now share their photos. Consider adding a thank-you note, and keep the site up for a while as a shared album.",
  },
};

export function getWebsiteStageInfo(stage: WebsiteStage): WebsiteStageInfo {
  return { stage, ...STAGE_INFO[stage] };
}

export type WebsiteContent = {
  enabled: boolean;
  headline: string;
  story: string;
  coverUrl: string;
  couplePhotoUrl: string;
  scheduleCount: number;
  travel: string;
  accommodations: string;
  faqCount: number;
  registryCount: number;
  rsvpDeadline: string;
};

export type ChecklistItem = {
  key: string;
  label: string;
  tab: WebsiteTab;
  done: boolean;
  /** True when the current stage is past the point this should be done. */
  overdue: boolean;
};

type ChecklistDef = {
  key: string;
  label: string;
  tab: WebsiteTab;
  dueBy: WebsiteStage;
  isDone: (c: WebsiteContent) => boolean;
};

const hasText = (value: string): boolean => value.trim().length > 0;

const CHECKLIST: ChecklistDef[] = [
  { key: "cover", label: "Add a cover photo", tab: "setup", dueBy: "start", isDone: (c) => hasText(c.coverUrl) },
  { key: "story", label: "Write your story", tab: "setup", dueBy: "start", isDone: (c) => hasText(c.story) },
  { key: "headline", label: "Add a headline", tab: "setup", dueBy: "build", isDone: (c) => hasText(c.headline) },
  { key: "couple-photo", label: "Add a couple photo", tab: "setup", dueBy: "build", isDone: (c) => hasText(c.couplePhotoUrl) },
  { key: "schedule", label: "Add your schedule", tab: "schedule", dueBy: "build", isDone: (c) => c.scheduleCount > 0 },
  { key: "travel", label: "Add travel & venue info", tab: "schedule", dueBy: "build", isDone: (c) => hasText(c.travel) },
  { key: "stay", label: "Add where to stay", tab: "schedule", dueBy: "build", isDone: (c) => hasText(c.accommodations) },
  { key: "faq", label: "Add a few FAQs", tab: "schedule", dueBy: "build", isDone: (c) => c.faqCount > 0 },
  { key: "registry", label: "Add registry links", tab: "registry", dueBy: "build", isDone: (c) => c.registryCount > 0 },
  { key: "rsvp", label: "Set an RSVP deadline", tab: "rsvp", dueBy: "build", isDone: (c) => hasText(c.rsvpDeadline) },
  { key: "publish", label: "Publish your website", tab: "setup", dueBy: "build", isDone: (c) => c.enabled },
];

export type WebsiteProgressSummary = {
  daysUntil: number | null;
  stage: WebsiteStage;
  stageInfo: WebsiteStageInfo;
  checklist: ChecklistItem[];
  outstanding: ChecklistItem[];
  doneCount: number;
  totalCount: number;
  overdueCount: number;
  isComplete: boolean;
};

/**
 * Build the full website progress summary for the couple's current
 * point in the timeline.
 */
export function getWebsiteProgress(
  daysUntil: number | null,
  content: WebsiteContent
): WebsiteProgressSummary {
  const stage = getWebsiteStage(daysUntil);
  const stageOrder = STAGE_ORDER[stage];

  const checklist: ChecklistItem[] = CHECKLIST.map((def) => {
    const done = def.isDone(content);
    return {
      key: def.key,
      label: def.label,
      tab: def.tab,
      done,
      overdue: !done && stageOrder > STAGE_ORDER[def.dueBy],
    };
  });

  const doneCount = checklist.filter((item) => item.done).length;
  const outstanding = checklist.filter((item) => !item.done);
  const overdueCount = outstanding.filter((item) => item.overdue).length;

  return {
    daysUntil,
    stage,
    stageInfo: getWebsiteStageInfo(stage),
    checklist,
    outstanding,
    doneCount,
    totalCount: checklist.length,
    overdueCount,
    isComplete: doneCount === checklist.length,
  };
}
