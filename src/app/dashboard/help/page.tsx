"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "guide" | "faq" | "shortcuts" | "whats-new";

const FAQ = [
  { q: "How do I share my wedding website?", a: "Go to Wedding Website → Setup. Your URL is eydn.app/w/your-slug. Copy it and share via email, text, or social media. You can also generate unique RSVP links per guest in the RSVP tab.", link: "/dashboard/website" },
  { q: "Can my partner see everything?", a: "Yes! When you invite your partner as a collaborator, they get full access to view, edit, and manage everything — guests, vendors, tasks, budget, website, and more.", link: "/dashboard/settings" },
  { q: "How do vendor emails get generated?", a: "Go to any vendor's detail page and click 'Send Email'. Eydn generates a professional inquiry email pre-filled with your wedding details. You can customize it before sending.", link: "/dashboard/vendors" },
  { q: "Can I change my wedding date after setting up my timeline?", a: "Yes! Go to Settings → Review Questionnaire. Your rehearsal dinner date and all planning milestones will automatically update. Any appointments you've created will be flagged for manual rescheduling.", link: "/dashboard/settings" },
  { q: "How do I invite my partner or coordinator?", a: "Go to Settings → Collaborators, or accept the invitation during onboarding. Partners get full access. Coordinators can manage tasks, vendors, and guests. Parents get read-only access.", link: "/dashboard/settings" },
  { q: "What happens after my 14-day trial?", a: "Your dashboard becomes read-only. You can still view and export all your data. To restore full access, upgrade for $79 (one-time, forever). No data is ever deleted during this period.", link: "/dashboard/pricing" },
  { q: "How does the AI assistant remember my preferences?", a: "Go to Settings → Things Eydn should know, or use the card on your dashboard. Add your style, allergies, priorities, and key decisions. Eydn uses this in every conversation.", link: "/dashboard/settings" },
  { q: "Can I restore something I accidentally deleted?", a: "Yes! Go to Settings → Recently Deleted. All deleted items are kept for 30 days and can be restored with one click.", link: "/dashboard/settings" },
  { q: "How do I generate QR codes for invitations?", a: "Go to Wedding Website → RSVP tab → Generate RSVP Links, then Generate QR Codes. Each guest gets a unique QR that links directly to their personalized RSVP page.", link: "/dashboard/website" },
  { q: "How do I set up my wedding website?", a: "Go to Wedding Website → Setup. Choose a URL, toggle the site on, upload a cover image, pick a theme, and add your story. The live preview shows changes in real-time.", link: "/dashboard/website" },
  { q: "What's the Memory Plan?", a: "After 12 months post-wedding, your account becomes read-only. The Memory Plan ($29/year) keeps your wedding website live and your data fully accessible indefinitely.", link: "/dashboard/pricing" },
  { q: "Can multiple people edit at the same time?", a: "Yes! Collaborators can edit simultaneously. All changes sync automatically. Use Comments on tasks and vendors to coordinate.", link: "/dashboard/settings" },
];

type GuideItem = { label: string; desc: string; icon: string; link?: string; linkLabel?: string };
type GuideSection = { title: string; items: GuideItem[] };

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Chat with Eydn", desc: "Your AI wedding planning assistant. Ask anything — it knows your date, budget, vendors, guests, and preferences.", icon: "💬", link: "/dashboard/chat", linkLabel: "Start Chatting" },
      { label: "Complete your wedding profile", desc: "Add your date, venue, budget, and style preferences to personalize your experience.", icon: "📋", link: "/dashboard/onboarding?review=true", linkLabel: "Review Profile" },
      { label: "Set your budget", desc: "36 line items pre-populated with recommended allocations. Fill in estimates as you get quotes.", icon: "💰", link: "/dashboard/budget", linkLabel: "Go to Budget" },
      { label: "Create your guest list", desc: "Add guests manually or import via CSV. Track RSVPs, meals, and groups.", icon: "👥", link: "/dashboard/guests", linkLabel: "Go to Guests" },
      { label: "Invite your partner", desc: "Planning is better together. Your partner gets full access to everything.", icon: "💑", link: "/dashboard/settings", linkLabel: "Invite Partner" },
    ],
  },
  {
    title: "Planning Tools",
    items: [
      { label: "Task timeline", desc: "50+ tasks auto-generated from your date. Mark complete, add notes, drag to reorder.", icon: "✅", link: "/dashboard/tasks", linkLabel: "Go to Tasks" },
      { label: "Vendor tracker", desc: "Track 13 categories through the pipeline: searching → booked → paid. Use email templates for outreach.", icon: "🏪", link: "/dashboard/vendors", linkLabel: "Go to Vendors" },
      { label: "Seating chart", desc: "Drag-and-drop tables with seat positions. Round and rectangle tables with guest assignments.", icon: "🪑", link: "/dashboard/seating", linkLabel: "Go to Seating" },
      { label: "Vision board", desc: "Upload images or paste URLs from Pinterest. Organize by category, link to vendors.", icon: "🎨", link: "/dashboard/mood-board", linkLabel: "Go to Vision Board" },
      { label: "Day-of planner", desc: "Complete day-of timeline, ceremony script, music, speeches, setup tasks, and packing checklist.", icon: "📅", link: "/dashboard/day-of", linkLabel: "Go to Day-of" },
      { label: "Planning guides", desc: "Step-by-step questionnaires for flowers, music, attire, and more. Generate vendor briefs automatically.", icon: "📖", link: "/dashboard/guides", linkLabel: "Go to Guides" },
    ],
  },
  {
    title: "Wedding Website",
    items: [
      { label: "Build your site", desc: "Choose a URL, pick a theme with your wedding colors, add your story, schedule, and travel info.", icon: "🌐", link: "/dashboard/website", linkLabel: "Go to Website" },
      { label: "RSVP system", desc: "Generate unique RSVP links and QR codes per guest. Track responses, meals, and plus-ones.", icon: "💌", link: "/dashboard/website", linkLabel: "Manage RSVPs" },
      { label: "Photo gallery", desc: "Guests upload photos directly. Moderate before publishing. Download all as ZIP after the wedding.", icon: "📸", link: "/dashboard/website", linkLabel: "Manage Gallery" },
    ],
  },
  {
    title: "Data & Security",
    items: [
      { label: "Download your data", desc: "Full export of everything — guests, vendors, tasks, budget, chat history — as JSON or PDF.", icon: "💾", link: "/dashboard/settings", linkLabel: "Go to Settings" },
      { label: "Restore deleted items", desc: "All deleted items kept for 30 days. One-click restore from Settings → Recently Deleted.", icon: "♻️", link: "/dashboard/settings", linkLabel: "View Trash" },
      { label: "Daily backups", desc: "Your data is backed up every night to redundant off-site servers.", icon: "🔒" },
    ],
  },
];

const WHATS_NEW = [
  { date: "March 2026", title: "Wedding Website Overhaul", items: ["Live preview while editing", "Theme & color customization", "QR codes for physical invitations", "Gallery moderation queue", "Structured hotel/accommodation cards", "Schedule import from Day-of Planner"] },
  { date: "March 2026", title: "Communication System", items: ["SMS notifications via Twilio", "Web push notifications", "Collaborator invitation emails", "Overdue task alerts", "Vendor payment reminders", "Email engagement tracking"] },
  { date: "March 2026", title: "Data Integrity", items: ["Date/time synchronization across the app", "Cascading updates when wedding date changes", "Persistent warning banners for date changes", "Smart task shifting (milestones vs appointments)"] },
  { date: "March 2026", title: "Inclusive Language", items: ["Replaced gendered terms throughout the app", "Partner 1/Partner 2 instead of bride/groom", "Attendant/Honor Attendant for wedding party roles"] },
  { date: "March 2026", title: "Admin Dashboard", items: ["Analytics with recharts visualizations", "Vendor insights and directory management", "Database & backup monitoring", "AI & integrations health dashboard", "Cron job management with manual triggers"] },
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
  const [search, setSearch] = useState("");

  const filteredFaq = search
    ? FAQ.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : FAQ;

  const filteredGuide = search
    ? GUIDE_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase())),
      })).filter((s) => s.items.length > 0)
    : GUIDE_SECTIONS;

  return (
    <div className="max-w-3xl">
      <h1>Help & Support</h1>
      <p className="mt-1 text-[15px] text-muted">
        Everything you need to make the most of Eydn
      </p>

      {/* Beta feedback banner */}
      <div className="mt-4 rounded-[16px] bg-violet/5 border border-violet/20 p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-plum">Beta feedback welcome!</p>
          <p className="text-[12px] text-muted mt-0.5">Found a bug or have a suggestion? We want to hear it.</p>
        </div>
        <a href="mailto:feedback@eydn.app?subject=Eydn Beta Feedback" className="btn-primary btn-sm flex-shrink-0">
          Send Feedback
        </a>
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search help topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-white pl-9 pr-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-border">
        {([
          { key: "guide" as Tab, label: "User Guide" },
          { key: "faq" as Tab, label: "FAQ" },
          { key: "whats-new" as Tab, label: "What's New" },
          { key: "shortcuts" as Tab, label: "Shortcuts" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${
              tab === t.key
                ? "border-violet text-violet"
                : "border-transparent text-muted hover:text-plum"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* User Guide */}
      {tab === "guide" && (
        <div className="mt-8 space-y-10">
          {filteredGuide.map((section) => (
            <div key={section.title}>
              <h2 className="text-[18px] font-semibold text-plum">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div key={item.label} className="card p-4 flex items-start gap-3">
                    <span className="text-[20px] flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-plum">{item.label}</p>
                      <p className="mt-1 text-[14px] text-muted leading-relaxed">{item.desc}</p>
                    </div>
                    {item.link && (
                      <Link href={item.link} className="text-[12px] text-violet font-semibold hover:text-plum transition flex-shrink-0 mt-1">
                        {item.linkLabel || "Go"} &rarr;
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredGuide.length === 0 && (
            <p className="text-[15px] text-muted text-center py-8">No results for &ldquo;{search}&rdquo;</p>
          )}
        </div>
      )}

      {/* FAQ */}
      {tab === "faq" && (
        <div className="mt-8 space-y-2">
          {filteredFaq.map((item, i) => (
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
                  {item.link && (
                    <Link href={item.link} className="mt-2 inline-block text-[13px] text-violet font-semibold hover:text-plum transition">
                      Go there &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
          {filteredFaq.length === 0 && (
            <p className="text-[15px] text-muted text-center py-8">No results for &ldquo;{search}&rdquo;</p>
          )}
        </div>
      )}

      {/* What's New */}
      {tab === "whats-new" && (
        <div className="mt-8 space-y-8">
          {WHATS_NEW.map((release, i) => (
            <div key={i}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[12px] font-semibold text-violet bg-lavender px-2.5 py-0.5 rounded-full">{release.date}</span>
                <h3 className="text-[16px] font-semibold text-plum">{release.title}</h3>
              </div>
              <ul className="space-y-1.5 ml-1">
                {release.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-[14px] text-muted">
                    <span className="text-violet mt-1 flex-shrink-0">+</span>
                    {item}
                  </li>
                ))}
              </ul>
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
          Chat with Eydn for instant answers, or reach out to our team directly.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/dashboard/chat" className="btn-primary btn-sm">
            Chat with Eydn
          </Link>
          <a
            href="mailto:support@eydn.app?subject=Eydn Support Request"
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 5L8 9L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Email Support
          </a>
          <a
            href="mailto:feedback@eydn.app?subject=Eydn Feedback"
            className="btn-ghost btn-sm"
          >
            Send Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
