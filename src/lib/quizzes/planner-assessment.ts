import type { ScoreBandQuiz } from "./types";

/**
 * Scoring: each answer A/B/C/D is worth 0/1/2/3 points respectively.
 * Max 24. Bands: 0–8 low, 9–16 medium, 17–24 high.
 */
export const plannerAssessmentQuiz: ScoreBandQuiz = {
  id: "planner_assessment",
  slug: "do-i-need-a-planner",
  title: "Can you plan your wedding without a planner?",
  subtitle: "Eight questions, two minutes. We'll score your wedding's complexity and tell you whether you need a planner, a coordinator, or just a good system.",
  questions: [
    {
      id: 1,
      prompt: "How many guests are you expecting?",
      options: [
        { label: "Under 50", value: 0 },
        { label: "50–100", value: 1 },
        { label: "100–150", value: 2 },
        { label: "150+", value: 3 },
      ],
    },
    {
      id: 2,
      prompt: "How many ceremonies or events are part of your wedding weekend?",
      options: [
        { label: "Just the ceremony and reception", value: 0 },
        { label: "Two events (e.g., rehearsal dinner + wedding)", value: 1 },
        { label: "Three events", value: 2 },
        { label: "Four or more", value: 3 },
      ],
    },
    {
      id: 3,
      prompt: "Is your wedding in a different city or country than where you live?",
      options: [
        { label: "No, it's local", value: 0 },
        { label: "A few hours away", value: 1 },
        { label: "Different state", value: 2 },
        { label: "Destination — we're traveling for it", value: 3 },
      ],
    },
    {
      id: 4,
      prompt: "How comfortable are you coordinating multiple vendors at once?",
      options: [
        { label: "Very — I do this kind of thing at work", value: 0 },
        { label: "Somewhat — I can handle it with good tools", value: 1 },
        { label: "Not really — it stresses me out", value: 2 },
        { label: "Not at all — I'd rather someone else manage that", value: 3 },
      ],
    },
    {
      id: 5,
      prompt: "How many vendors are you hiring? (photographer, florist, caterer, DJ, etc.)",
      options: [
        { label: "1–3", value: 0 },
        { label: "4–6", value: 1 },
        { label: "7–9", value: 2 },
        { label: "10+", value: 3 },
      ],
    },
    {
      id: 6,
      prompt: "How far out is your wedding date?",
      options: [
        { label: "18+ months", value: 0 },
        { label: "12–18 months", value: 1 },
        { label: "6–12 months", value: 2 },
        { label: "Under 6 months", value: 3 },
      ],
    },
    {
      id: 7,
      prompt: "Have you planned a large event before?",
      options: [
        { label: "Yes, multiple times", value: 0 },
        { label: "Once or twice", value: 1 },
        { label: "Something small, not at this scale", value: 2 },
        { label: "Never", value: 3 },
      ],
    },
    {
      id: 8,
      prompt: "How aligned are you and your partner on vision, budget, and priorities?",
      options: [
        { label: "Completely aligned — we've talked through everything", value: 0 },
        { label: "Mostly aligned with a few things to work out", value: 1 },
        { label: "We agree on the big stuff but disagree on details", value: 2 },
        { label: "We're still figuring it out", value: 3 },
      ],
    },
  ],
  bands: [
    { min: 0, max: 8, resultIndex: 0 },
    { min: 9, max: 16, resultIndex: 1 },
    { min: 17, max: 24, resultIndex: 2 },
  ],
  results: [
    {
      key: "low",
      label: "Low complexity",
      headline: "You can absolutely DIY this.",
      body:
        "Your wedding is manageable in scope — the guest list is tight, the logistics aren't stacked against you, and you've got enough runway to stay ahead of it. Plenty of couples plan a wedding exactly like yours without ever hiring a professional planner.\n\nWhat you need isn't a coordinator. It's a good system.",
      eydnAngle:
        "Eydn generates your full task timeline from your wedding date, tracks every dollar against your budget, and gives you an AI planner that knows your wedding inside and out. Everything in one place, none of the $4,000 price tag. Start free — you'll have a plan built in under 10 minutes.",
    },
    {
      key: "medium",
      label: "Medium complexity",
      headline: "You could DIY this — with the right setup.",
      body:
        "Your wedding has real moving parts. Not unmanageable — but the kind where winging it will cost you, in stress if not in money. You probably don't need a full planner. But you do need more than a shared Google doc and good intentions.\n\nThe couples who pull this off without outside help all have one thing in common: they got organized early and stayed that way.",
      eydnAngle:
        "Eydn handles the organizational layer — task timeline, budget tracking, vendor management, partner collaboration — so you can focus your energy on the decisions that actually need you. And if you bring in a day-of coordinator down the road, Eydn's day-of binder gives them everything they need to hit the ground running.",
    },
    {
      key: "high",
      label: "High complexity",
      headline: "A day-of coordinator is probably worth it — and Eydn handles everything else.",
      body:
        "Your wedding is genuinely complex. Multi-vendor, high guest count, tight timeline, destination logistics, or some combination — this is the kind of event where a professional coordinator on the day itself is a smart call. Not a failure. Not a sign you can't handle it. Just the right tool for the job.\n\nWhat a coordinator won't do is manage the next 12 months of planning for you. That part is still yours.",
      eydnAngle:
        "Build your full plan in Eydn — task timeline, budget, vendor contacts, guest list, the whole thing. Track it, update it, and ask the AI when you hit a wall. Then, when your wedding weekend arrives, hand your coordinator the day-of binder and let them take it from there. You planned it. They execute it. Everyone wins.",
    },
  ],
};
