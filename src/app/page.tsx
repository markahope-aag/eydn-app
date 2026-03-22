import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[600px] sm:min-h-[700px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="" className="w-full h-full object-cover" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A1030]/80 via-[#1A1030]/60 to-[#1A1030]/40" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-24 sm:py-32">
          <h1 className="text-[40px] sm:text-[52px] font-semibold text-white leading-[1.1]" style={{ letterSpacing: "-1px" }}>
            Plan your wedding,<br />not your stress
          </h1>
          <p className="mt-6 text-[18px] text-white/80 max-w-2xl mx-auto leading-relaxed">
            eydn is your AI-powered wedding planning guide. From guest lists to vendor outreach to your day-of timeline — everything in one place, with a personal touch.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Show when="signed-out">
              <SignUpButton>
                <button className="rounded-full bg-white px-8 py-3.5 text-[15px] font-semibold text-violet shadow-lg hover:bg-lavender transition">
                  Start Your Free Trial
                </button>
              </SignUpButton>
              <Link
                href="/#features"
                className="rounded-full border-2 border-white/30 px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition"
              >
                See Features
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-full bg-white px-8 py-3.5 text-[15px] font-semibold text-violet shadow-lg hover:bg-lavender transition"
              >
                Go to Dashboard
              </Link>
            </Show>
          </div>
          <p className="mt-4 text-[13px] text-white/60">14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-6 bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-center gap-8 text-[13px] text-muted">
          <span>50+ auto-generated tasks</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>13 vendor categories</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>AI that remembers your vision</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>Complete day-of binder</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>Bank-grade data protection</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-whisper">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <p className="text-[13px] font-semibold text-violet uppercase tracking-wide">Features</p>
            <h2 className="mt-2 text-[34px] font-semibold text-plum" style={{ letterSpacing: "-0.5px" }}>
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-4 text-[15px] text-muted max-w-2xl mx-auto">
              Stop juggling 5 different apps. eydn brings your entire wedding plan into one place — smart, personal, and actually fun to use.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="card p-6">
                <div
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center text-2xl"
                  style={{ background: i % 2 === 0 ? "#F7C8E0" : "#F0E0FF" }}
                >
                  {f.icon}
                </div>
                <h3 className="mt-4 text-[18px] font-semibold text-plum">{f.title}</h3>
                <p className="mt-2 text-[15px] text-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <p className="text-[13px] font-semibold text-violet uppercase tracking-wide">How it works</p>
            <h2 className="mt-2 text-[34px] font-semibold text-plum" style={{ letterSpacing: "-0.5px" }}>
              From &ldquo;yes&rdquo; to &ldquo;I do&rdquo; in 3 steps
            </h2>
          </div>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-gradient flex items-center justify-center mx-auto">
                  <span className="text-[22px] font-semibold text-white">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-[18px] font-semibold text-plum">{s.title}</h3>
                <p className="mt-2 text-[15px] text-muted leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature deep-dives */}
      <section className="py-20 bg-whisper">
        <div className="max-w-5xl mx-auto px-6 space-y-20">
          {deepDives.map((d, i) => (
            <div key={d.title} className={`flex flex-col sm:flex-row gap-12 items-center ${i % 2 === 1 ? "sm:flex-row-reverse" : ""}`}>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-violet uppercase tracking-wide">{d.label}</p>
                <h3 className="mt-2 text-[26px] font-semibold text-plum" style={{ letterSpacing: "-0.5px" }}>{d.title}</h3>
                <p className="mt-4 text-[15px] text-muted leading-relaxed">{d.description}</p>
                <ul className="mt-4 space-y-2">
                  {d.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-lavender flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-violet text-[11px]">&#10003;</span>
                      </span>
                      <span className="text-[15px] text-plum">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-sm card-summary p-8 text-center">
                  <span className="text-[48px]">{d.icon}</span>
                  <p className="mt-2 text-[13px] text-muted">{d.cardText}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Security Banner */}
      <section className="py-16 bg-white border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <p className="text-[13px] font-semibold text-violet uppercase tracking-wide">Trust &amp; Security</p>
            <h2 className="mt-2 text-[28px] font-semibold text-plum" style={{ letterSpacing: "-0.5px" }}>
              We protect what matters most
            </h2>
            <p className="mt-3 text-[15px] text-muted max-w-2xl mx-auto">
              Your wedding plans are irreplaceable. We&apos;ve built eydn with multiple layers of data protection so you never have to worry about losing a single detail.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "\u{1F504}", title: "Daily Backups", desc: "Automated encrypted backups every night to redundant off-site servers" },
              { icon: "\u{267B}\uFE0F", title: "30-Day Recovery", desc: "Accidentally delete something? Restore any guest, task, or vendor instantly" },
              { icon: "\u{1F4E5}", title: "Data Export", desc: "Download everything in one click. Your data belongs to you, always" },
              { icon: "\u{1F6E1}\uFE0F", title: "Audit Trail", desc: "Every change is logged. See who changed what, when, with full history" },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <span className="text-[32px]">{item.icon}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-plum">{item.title}</h3>
                <p className="mt-1 text-[13px] text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[13px] font-semibold text-violet uppercase tracking-wide">Pricing</p>
          <h2 className="mt-2 text-[34px] font-semibold text-plum" style={{ letterSpacing: "-0.5px" }}>
            One price. Your whole wedding.
          </h2>
          <p className="mt-4 text-[15px] text-muted max-w-xl mx-auto">
            No subscriptions, no hidden fees. Pay once and plan your entire wedding with full access to every feature.
          </p>

          <div className="mt-12 card-summary p-10 max-w-md mx-auto">
            <p className="text-[13px] font-semibold text-muted uppercase tracking-wide">Full access</p>
            <div
              className="mt-2"
              style={{
                background: "linear-gradient(135deg, var(--violet), var(--blush-pink))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              <span className="text-[56px] font-semibold leading-none">$79</span>
            </div>
            <p className="mt-2 text-[15px] text-muted">One-time payment. 1 wedding. Forever.</p>

            <div className="mt-8 text-left space-y-3">
              {pricingFeatures.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-lavender flex items-center justify-center flex-shrink-0">
                    <span className="text-violet text-[11px]">&#10003;</span>
                  </div>
                  <span className="text-[15px] text-plum">{f}</span>
                </div>
              ))}
            </div>

            <Show when="signed-out">
              <SignUpButton>
                <button className="btn-primary w-full mt-8">
                  Start 14-Day Free Trial
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="btn-primary w-full mt-8 inline-flex justify-center">
                Go to Dashboard
              </Link>
            </Show>
            <p className="mt-3 text-[12px] text-muted">No credit card required for the trial.</p>
          </div>

          {/* Memory Plan */}
          <div className="mt-8 border border-border rounded-2xl p-8 max-w-md mx-auto text-left">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-semibold text-plum">Memory Plan</p>
              <div className="text-right">
                <span className="text-[28px] font-semibold text-plum">$29</span>
                <span className="text-[14px] text-muted">/year</span>
              </div>
            </div>
            <p className="mt-2 text-[14px] text-muted leading-relaxed">
              Keep your wedding website live and your data accessible after the wedding.
            </p>
            <div className="mt-5 space-y-2.5">
              {memoryPlanFeatures.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-lavender flex items-center justify-center flex-shrink-0">
                    <span className="text-violet text-[11px]">&#10003;</span>
                  </div>
                  <span className="text-[14px] text-plum">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-gradient">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-[34px] font-semibold text-white" style={{ letterSpacing: "-0.5px" }}>
            Your dream wedding starts here
          </h2>
          <p className="mt-4 text-[18px] text-white/80">
            Join the couples who are planning smarter with eydn.
          </p>
          <Show when="signed-out">
            <SignUpButton>
              <button className="mt-8 rounded-full bg-white px-10 py-3.5 text-[15px] font-semibold text-violet shadow-lg hover:bg-lavender transition">
                Get Started Free
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="mt-8 inline-block rounded-full bg-white px-10 py-3.5 text-[15px] font-semibold text-violet shadow-lg hover:bg-lavender transition"
            >
              Go to Dashboard
            </Link>
          </Show>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-white/70" style={{ backgroundColor: "#1A1030" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <p className="text-[18px] font-semibold text-white">eydn</p>
              <p className="mt-2 text-[13px] leading-relaxed">
                Your AI-powered wedding planning guide. From engagement to &ldquo;I do.&rdquo;
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white uppercase tracking-wide">Product</p>
              <div className="mt-3 space-y-2 text-[13px]">
                <Link href="/#features" className="block hover:text-white transition">Features</Link>
                <Link href="/#pricing" className="block hover:text-white transition">Pricing</Link>
                <Link href="/#how-it-works" className="block hover:text-white transition">How It Works</Link>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white uppercase tracking-wide">For Vendors</p>
              <div className="mt-3 space-y-2 text-[13px]">
                <Link href="/dashboard/vendor-portal" className="block hover:text-white transition">Vendor Portal</Link>
                <Link href="/#pricing" className="block hover:text-white transition">Placement Tiers</Link>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white uppercase tracking-wide">Company</p>
              <div className="mt-3 space-y-2 text-[13px]">
                <a href="mailto:support@eydn.app" className="block hover:text-white transition">Contact</a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-[12px]">
            <p>&copy; {new Date().getFullYear()} eydn. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: "\u{1F4AC}",
    title: "AI assistant that remembers you",
    description: "Chat with eydn for personalized advice — it knows your style, allergies, budget priorities, and every decision you've made. Like a planner who never forgets.",
  },
  {
    icon: "\u{2705}",
    title: "Smart task timeline",
    description: "50+ tasks auto-generated from your wedding date. Grouped by phase, with deadlines, priorities, and reminders.",
  },
  {
    icon: "\u{1F4B0}",
    title: "Budget tracker",
    description: "Track estimated costs, payments, and final costs by category. Link vendors to line items automatically.",
  },
  {
    icon: "\u{1F4CB}",
    title: "Guest management",
    description: "RSVPs, meal preferences, roles, addresses, plus-ones, and groups. Import via CSV. Send RSVP links.",
  },
  {
    icon: "\u{1F91D}",
    title: "Vendor tracker with Google profiles",
    description: "Manage 13 vendor categories with status pipeline, contacts, financials, email templates, and auto-enriched Google Business profiles with ratings and reviews.",
  },
  {
    icon: "\u{1F310}",
    title: "Wedding website",
    description: "A beautiful public page for your guests with schedule, travel info, registry links, photo gallery, and RSVP.",
  },
  {
    icon: "\u{1F4BA}",
    title: "Seating chart",
    description: "Drag-and-drop tables for your reception. Ceremony layout for who stands where at the altar.",
  },
  {
    icon: "\u{1F4C5}",
    title: "Complete day-of binder",
    description: "Timeline, ceremony script, music lists, speeches, setup assignments, attire details, vendor contacts, and packing checklist — all exportable as a beautiful branded PDF.",
  },
  {
    icon: "\u{1F4F8}",
    title: "Photo gallery",
    description: "Guests upload their photos to a shared album right from your wedding website. No app download needed.",
  },
  {
    icon: "\u{1F512}",
    title: "Your data, protected",
    description: "Daily encrypted backups, soft-delete recovery, full data export, and audit logging. Your wedding plans are never at risk.",
  },
];

const steps = [
  {
    title: "Tell us about your wedding",
    description: "Complete a quick 11-step guided setup. eydn learns your date, budget, style, and what you've already booked.",
  },
  {
    title: "Get your personalized plan",
    description: "eydn generates 50+ tasks with real deadlines, a pre-built budget with line items, and a custom planning timeline.",
  },
  {
    title: "Plan with confidence",
    description: "Track vendors, manage guests, build your seating chart, and chat with eydn whenever you need advice.",
  },
];

const deepDives = [
  {
    label: "AI Assistant",
    title: "Like having a planner in your pocket",
    description: "eydn knows your wedding inside and out — your budget, guest count, vendor statuses, task progress, and every key decision you've made. It remembers your preferences across every conversation.",
    bullets: [
      "Remembers your style, allergies, priorities, and decisions",
      "Personalized answers based on your complete wedding data",
      "Vendor outreach tips and etiquette advice",
      "Budget allocation suggestions",
      "50-message conversation memory for natural dialogue",
      "Deadline reminders and next-step guidance",
    ],
    icon: "\u{1F4AC}",
    cardText: "\"What should I prioritize this month?\"",
  },
  {
    label: "Wedding Website",
    title: "One link for all your guests",
    description: "Share your custom wedding website with your schedule, travel details, registry, and RSVP — all in one place. Guests can even upload photos.",
    bullets: [
      "Custom URL (eydn.app/w/your-names)",
      "Schedule, travel info, accommodations, FAQ",
      "Guest photo uploads to a shared gallery",
      "Unique RSVP links for each guest",
    ],
    icon: "\u{1F310}",
    cardText: "eydn.app/w/mark-and-sarah",
  },
  {
    label: "Budget",
    title: "Know exactly where your money goes",
    description: "Start with a pre-built budget template with 36 line items across 13 categories. Track estimated costs, actual payments, and link vendors directly to budget items.",
    bullets: [
      "Pre-populated with standard wedding line items",
      "Estimated, paid, and final cost columns",
      "Link vendors to auto-sync costs",
      "Category subtotals and progress tracking",
    ],
    icon: "\u{1F4B0}",
    cardText: "36 pre-built line items across 13 categories",
  },
  {
    label: "Day-of Binder",
    title: "Your complete wedding binder, digitized",
    description: "Everything your coordinator, DJ, photographer, and wedding party needs — in one document. Per-person schedules, ceremony script, music cues, vendor arrival times, decor layouts, and more.",
    bullets: [
      "Separate schedules for bride, groom, bridesmaids, and groomsmen",
      "Full ceremony script with processional order",
      "Music list for every moment (ceremony, reception, dances)",
      "Speech order with speaker roles and topics",
      "Setup task assignments (who does what, day before)",
      "Attire documentation with photos",
      "Vendor contact sheet with arrival times and meal needs",
      "Packing checklist so nothing gets left behind",
    ],
    icon: "\u{1F4D6}",
    cardText: "Everything in one PDF — like Karly's 64-page binder",
  },
  {
    label: "Data Security",
    title: "Your plans deserve protection",
    description: "Your wedding is one of the most important events of your life. We treat your data with the same care you put into planning it. Daily backups, recovery tools, and full data ownership — built into every account.",
    bullets: [
      "Daily encrypted backups to redundant off-site servers",
      "Soft-delete recovery — restore anything within 30 days",
      "Download all your data anytime with one click",
      "Full audit trail of every change made to your wedding",
      "Point-in-time database recovery (7-day window)",
      "Enterprise-grade security headers and rate limiting",
    ],
    icon: "\u{1F6E1}\uFE0F",
    cardText: "Daily backups. 30-day recovery. Your data, always.",
  },
];

const memoryPlanFeatures = [
  "Wedding website stays online",
  "Full data access and export",
  "Edit guest list and photos",
  "Priority support",
];

const pricingFeatures = [
  "AI assistant that remembers your vision",
  "50+ auto-generated tasks with smart timeline",
  "Budget tracker with 36 pre-built line items",
  "Guest management with RSVP links",
  "Vendor tracker with Google Business profiles",
  "Beautiful wedding website for your guests",
  "Drag-and-drop seating chart",
  "Complete day-of binder with PDF export",
  "Ceremony script & music planning",
  "Rehearsal dinner planner",
  "Pinterest-style mood board",
  "Collaborative comments with your partner",
  "Guest photo gallery",
  "Email templates for vendor outreach",
  "Wedding party management with photos",
  "Smart deadline email reminders",
  "Daily backups with 30-day recovery",
  "Download all your data anytime",
];
