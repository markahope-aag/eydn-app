"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "guide" | "faq" | "shortcuts";

const FAQ = [
  { q: "Can I change my wedding date after setting up my timeline?", a: "Yes! Go to Settings → Review Questionnaire Answers to update your date. eydn will automatically regenerate your task timeline with adjusted deadlines." },
  { q: "How do I invite my partner or coordinator?", a: "Go to Settings → Collaborators. Enter their email and choose their role (Partner or Coordinator). When they sign up with that email, they'll automatically get access to your wedding." },
  { q: "What happens after my 14-day trial?", a: "Your dashboard becomes read-only. You can still view and export all your data. To restore full access, upgrade for $79 (one-time, forever). No data is ever deleted during this period." },
  { q: "How do I export my data?", a: "Go to Settings → Your Data → Download My Data. This exports everything — guests, vendors, tasks, budget, chat history, and more — as a JSON file." },
  { q: "Can I restore something I accidentally deleted?", a: "Yes! Go to Settings → Recently Deleted. All deleted items are kept for 30 days and can be restored with one click." },
  { q: "How does the AI assistant remember my preferences?", a: "Go to Settings → Things eydn should know. Add your style, allergies, priorities, and key decisions. eydn uses this context in every conversation, plus the last 50 messages of chat history." },
  { q: "How do I set up my wedding website?", a: "Go to Wedding Website → Setup. Choose a URL slug, toggle the site on, upload a cover image, and add your story. Share the link (eydn.app/w/your-slug) with guests." },
  { q: "Can I use eydn for my rehearsal dinner?", a: "Yes! There's a dedicated Rehearsal Dinner page in the sidebar where you can plan the venue, timeline, and guest list separately." },
  { q: "How do I generate the day-of timeline?", a: "Go to Day-of Planner → enter your ceremony time → click Generate Timeline. It creates 18 events working backwards from your ceremony. You can then customize each event." },
  { q: "What's the Memory Plan?", a: "After 12 months post-wedding, your account becomes read-only. The Memory Plan ($29/year) keeps your wedding website live and your data fully accessible indefinitely." },
  { q: "How do I add vendor photos and reviews?", a: "Click into any vendor's detail page. eydn automatically looks up their Google Business profile to show their photo, rating, reviews, and contact info." },
  { q: "Can multiple people edit at the same time?", a: "Yes! Collaborators (partner or coordinator) can edit simultaneously. All changes sync in real-time. Use the Comments feature on tasks and vendors to coordinate." },
];

const GUIDE_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { label: "Complete your wedding profile", desc: "Add your date, venue, budget, and style in the onboarding questionnaire or Settings." },
      { label: "Set your budget", desc: "36 line items are pre-populated. Go to Budget and fill in your estimated costs." },
      { label: "Create your guest list", desc: "Add guests manually or import via CSV. Set RSVP statuses, meals, and groups." },
      { label: "Invite your partner", desc: "Settings → Collaborators → enter their email as Partner role." },
      { label: "Chat with eydn", desc: "Ask eydn anything about wedding planning. It knows your date, budget, vendors, and preferences." },
    ],
  },
  {
    title: "Planning Tools",
    items: [
      { label: "Task timeline", desc: "50+ tasks auto-generated from your date, organized by phase. Mark as complete, add notes, drag to reorder." },
      { label: "Vendor tracker", desc: "Track 13 categories through the pipeline: searching → contacted → booked → paid. Use email templates for outreach." },
      { label: "Seating chart", desc: "Drag-and-drop tables. Click Edit on any table to change size, shape, or name. Drag guests from the sidebar onto tables." },
      { label: "Vision board", desc: "Upload images or paste URLs (including Pinterest). Organize by category and venue location." },
      { label: "Day-of planner", desc: "8 tabs: Timeline, Ceremony Script, Music, Speeches, Setup Tasks, Attire, Vendor Contacts, Packing Checklist." },
      { label: "Rehearsal dinner", desc: "Separate page for venue, timeline, and guest list for the rehearsal." },
    ],
  },
  {
    title: "Wedding Website",
    items: [
      { label: "Setup", desc: "Choose your URL, upload cover/couple photos, write your story." },
      { label: "Schedule & Info", desc: "Add schedule items, travel info, accommodations, and FAQ for guests." },
      { label: "RSVP system", desc: "Generate unique RSVP links per guest. Track responses, meal preferences, and plus-ones." },
      { label: "Photo gallery", desc: "Guests upload photos directly. You approve them before they appear on the site." },
      { label: "Registry links", desc: "Add links to your registries (Amazon, Zola, etc.) for guests to find easily." },
    ],
  },
  {
    title: "Collaboration",
    items: [
      { label: "Invite collaborators", desc: "Settings → Collaborators. Partners get full access. Coordinators can view and edit planning data." },
      { label: "Comments", desc: "Leave comments on any task or vendor. Your partner and coordinator see them instantly." },
      { label: "Activity feed", desc: "The dashboard shows recent changes and comments so everyone stays in sync." },
    ],
  },
  {
    title: "Data & Security",
    items: [
      { label: "Download your data", desc: "Settings → Your Data → Download My Data. Full JSON export of everything." },
      { label: "Restore deleted items", desc: "Settings → Recently Deleted. 30-day recovery window for all deleted items." },
      { label: "Activity log", desc: "Settings → Activity Log. See every create, update, delete, and restore action." },
      { label: "Daily backups", desc: "Your data is backed up every night to redundant off-site servers." },
      { label: "Dark mode", desc: "Settings → Theme. Toggle between light and dark mode." },
    ],
  },
];

const SHORTCUTS = [
  { keys: "⌘ K", desc: "Open command palette — search and navigate anywhere" },
  { keys: "Enter", desc: "Select item in command palette" },
  { keys: "↑ ↓", desc: "Navigate command palette results" },
  { keys: "Esc", desc: "Close any modal or dialog" },
];

export default function HelpPage() {
  const [tab, setTab] = useState<Tab>("guide");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-3xl">
      <h1>Help & Support</h1>
      <p className="mt-1 text-[15px] text-muted">
        Everything you need to make the most of eydn
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {([
          { key: "guide" as Tab, label: "User Guide" },
          { key: "faq" as Tab, label: "FAQ" },
          { key: "shortcuts" as Tab, label: "Shortcuts" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${
              tab === t.key
                ? "border-violet text-violet"
                : "border-transparent text-plum/60 hover:text-plum"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* User Guide */}
      {tab === "guide" && (
        <div className="mt-8 space-y-10">
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-[18px] font-semibold text-plum">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div key={item.label} className="card p-4">
                    <p className="text-[15px] font-semibold text-plum">{item.label}</p>
                    <p className="mt-1 text-[14px] text-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      {tab === "faq" && (
        <div className="mt-8 space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
              >
                <span className="text-[15px] font-semibold text-plum">{item.q}</span>
                <span className="text-violet text-[18px] font-light flex-shrink-0 transition-transform" style={{ transform: openFaq === i ? "rotate(45deg)" : "none" }}>
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-[14px] text-muted leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shortcuts */}
      {tab === "shortcuts" && (
        <div className="mt-8">
          <div className="space-y-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="card px-5 py-3 flex items-center justify-between">
                <span className="text-[14px] text-muted">{s.desc}</span>
                <kbd className="px-3 py-1 rounded-[8px] bg-lavender text-violet text-[13px] font-semibold font-mono">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact support */}
      <div className="mt-12 card p-6 text-center">
        <h2 className="text-[18px] font-semibold text-plum">Still need help?</h2>
        <p className="mt-2 text-[14px] text-muted">
          Chat with eydn for instant answers, or reach out to our support team.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/dashboard/chat" className="btn-primary btn-sm">
            Chat with eydn
          </Link>
          <a href="mailto:support@eydn.app" className="btn-ghost btn-sm">
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
