/**
 * Content data for the landing page — extracted from page.tsx so the page
 * file can stay focused on layout. Edit copy here without touching JSX.
 */

export const features = [
  { title: "Task timeline", description: "50+ tasks auto-generated from your wedding date. Grouped by phase, with deadlines, priorities, and reminders." },
  { title: "Budget tracker", description: "Track estimated costs, payments, and final costs by category. Link vendors to line items automatically." },
  { title: "Guest management", description: "RSVPs, meal preferences, roles, addresses, plus-ones, and groups. Import via CSV. Send RSVP links." },
  { title: "Vendor tracker with Google profiles", description: "Manage 13 vendor categories with status pipeline, contacts, financials, email templates, and auto-enriched Google Business profiles with ratings and reviews." },
  { title: "Wedding website", description: "A beautiful public page for your guests with schedule, travel info, registry links, photo gallery, and RSVP." },
  { title: "Complete day-of binder", description: "Timeline, ceremony script, music lists, speeches, setup assignments, attire details, vendor contacts, and packing checklist — all exportable as a beautiful branded PDF." },
  { title: "Vision board", description: "Pin the photos, palettes, and details that feel right — then pull them into vendor briefs and style notes without retyping a thing." },
  { title: "AI planner that takes action", description: "Eydn sees your full wedding data and actually does things — adds guests, books vendors, searches the web for venues and pricing, generates vendor briefs, and proactively tells you what needs attention." },
  { title: "Seating chart", description: "Drag-and-drop tables for your reception. Ceremony layout for who stands where at the altar." },
  { title: "Photo gallery", description: "Guests upload their photos to a shared album right from your wedding website. No app download needed." },
];

export const steps = [
  { title: "Tell us about your wedding", description: "Complete a quick 11-step guided setup. Eydn learns your date, budget, style, and what you've already booked." },
  { title: "Get your personalized plan", description: "Eydn generates 50+ tasks with real deadlines, a pre-built budget with line items, and a custom planning timeline." },
  { title: "Plan with confidence", description: "Track vendors, manage guests, build your seating chart, and let Eydn handle the rest — it searches for vendors, takes actions, and tells you what needs attention." },
];

export const memoryPlanFeatures = [
  "Wedding website stays online",
  "Full data access and export",
  "Edit guest list and photos",
  "Priority support",
];

export const pricingFeatures = [
  "AI planner that takes action and searches the web",
  "50+ auto-generated tasks grouped by phase",
  "Budget tracker with 36 pre-built line items",
  "Guest management with RSVP links",
  "Vendor tracker with Google Business profiles",
  "Beautiful wedding website for your guests",
  "Drag-and-drop seating chart",
  "Complete day-of binder with PDF export",
  "Ceremony script & music planning",
  "Rehearsal dinner planner",
  "Pinterest-style vision board",
  "Collaborative comments with your partner",
  "Guest photo gallery",
  "Email templates for vendor outreach",
  "Wedding party management with photos",
  "Smart deadline email reminders",
  "Daily backups with 30-day recovery",
  "Download all your data anytime",
];

export const testimonials = [
  {
    quote: "We were overwhelmed before Eydn. Having everything — tasks, budget, vendors, guests — in one place with an AI that actually remembered our preferences changed everything.",
    names: "Priya & James",
    detail: "Married June 2025 \u00B7 Chicago, IL",
  },
  {
    quote: "The day-of binder alone was worth it. Our coordinator said it was the most organized couple she'd ever worked with.",
    names: "Sarah & Michael",
    detail: "Married Sept 2025 \u00B7 Austin, TX",
  },
  {
    quote: "I almost spent $3,000 on a wedding planner. Eydn did everything I needed for $79. I cannot believe this is a one-time payment.",
    names: "Lauren & Chris",
    detail: "Married May 2025 \u00B7 Denver, CO",
  },
];

export const featureScriptLabels = [
  "Stay on track",
  "Every dollar, accounted for",
  "Everyone, organized",
  "Your dream team",
  "Share your story",
  "The final touch",
  "Safe and sound",
];

export const featureBullets: string[][] = [
  ["50+ tasks auto-generated from your date", "Grouped by phase with smart deadlines", "Priority levels and completion tracking", "Reminders so nothing slips through"],
  ["36 pre-built line items across 13 categories", "Track estimated, paid, and final costs", "Link vendors to budget items automatically", "Category subtotals and visual progress"],
  ["RSVPs, meal choices, plus-ones, and groups", "Import guests via CSV in seconds", "Unique RSVP links for each guest", "Addresses and roles management"],
  ["13 vendor categories with status pipeline", "Auto-enriched Google Business profiles", "Contact details, financials, and notes", "Email templates for outreach"],
  ["Custom URL for your guests", "Schedule, travel, registry, and FAQ sections", "Guest photo uploads to shared gallery", "RSVP integration built in"],
  ["Timeline, ceremony script, and music lists", "Per-person schedules for the entire party", "Vendor contacts with arrival times", "Export as a beautiful branded PDF"],
  ["256-bit encryption at rest", "Daily encrypted backups with 30-day recovery", "Full data export anytime", "Audit logging for every change"],
];

/** Dark row indices for the feature grid — 1 (Budget) and 5 (Day-of Binder). */
export const darkRowIndices = new Set([1, 5]);
