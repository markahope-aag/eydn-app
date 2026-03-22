"use client";

import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import { Cormorant_Garamond, DM_Sans, Great_Vibes } from "next/font/google";
import { useEffect, useRef, type ReactNode } from "react";

/* ── Fonts ───────────────────────────────────────────────── */

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
});

/* ── ScrollReveal ────────────────────────────────────────── */

function ScrollReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("sr-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`sr-reveal ${className}`}
      style={{
        opacity: 0,
        transform: "translateY(28px)",
        transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Keyframe styles (injected once) ─────────────────────── */

const keyframeCSS = `
.sr-visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(-2deg); }
  50% { transform: translateY(-14px) rotate(-2deg); }
}
@keyframes float2 {
  0%, 100% { transform: translateY(0px) rotate(1deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
}
@keyframes float3 {
  0%, 100% { transform: translateY(0px) rotate(2deg); }
  50% { transform: translateY(-18px) rotate(2deg); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

/* ── Mini UI Components for Hero ─────────────────────────── */

function HeroTaskCard() {
  const tasks = [
    { label: "Book photographer", due: "Mar 15", color: "#C9A84C", done: true },
    { label: "Finalize guest list", due: "Mar 22", color: "#2C3E2D", done: false },
    { label: "Cake tasting", due: "Apr 2", color: "#D4A5A5", done: false },
    { label: "Send invitations", due: "Apr 10", color: "#C9A84C", done: false },
  ];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        width: 260,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        transform: "rotate(-2deg)",
        animation: "float 5s ease-in-out infinite",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Task Timeline</p>
      {tasks.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < tasks.length - 1 ? 10 : 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0, opacity: t.done ? 0.5 : 1 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: t.done ? "#aaa" : "#1A1A2E", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.label}</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#6B6B6B" }}>{t.due}</span>
        </div>
      ))}
    </div>
  );
}

function HeroBudgetCard() {
  const rows = [
    { cat: "Venue", est: "$12,000", paid: "$6,000" },
    { cat: "Catering", est: "$8,500", paid: "$2,000" },
    { cat: "Photography", est: "$3,200", paid: "$1,600" },
  ];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        width: 270,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        transform: "rotate(1deg)",
        animation: "float2 6s ease-in-out infinite",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Budget Tracker</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 14px", fontFamily: "var(--font-body)", fontSize: 11 }}>
        <span style={{ color: "#6B6B6B", fontWeight: 600 }}>Category</span>
        <span style={{ color: "#6B6B6B", fontWeight: 600 }}>Estimated</span>
        <span style={{ color: "#6B6B6B", fontWeight: 600 }}>Paid</span>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontSize: 13, color: "#1A1A2E" }}>{r.cat}</span>
            <span style={{ fontSize: 13, color: "#1A1A2E" }}>{r.est}</span>
            <span style={{ fontSize: 13, color: "#2C3E2D", fontWeight: 600 }}>{r.paid}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroAIChatCard() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        width: 280,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        transform: "rotate(2deg)",
        animation: "float3 7s ease-in-out infinite",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>AI Assistant</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "12px 12px 4px 12px", padding: "8px 12px", maxWidth: "80%", fontFamily: "var(--font-body)", fontSize: 12.5 }}>
          What should I prioritize this month?
        </div>
        <div style={{ alignSelf: "flex-start", background: "#FAF6F1", color: "#1A1A2E", borderRadius: "12px 12px 12px 4px", padding: "8px 12px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 12.5, lineHeight: 1.45 }}>
          Focus on booking your photographer and finalizing the guest list. Both have March deadlines.
        </div>
      </div>
    </div>
  );
}

/* ── Mini UI Components for Feature Rows ─────────────────── */

function MiniAIChat() {
  return (
    <div style={{ background: "#1A1A2E", borderRadius: 12, padding: 20, maxWidth: 380 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#FAF6F1", fontWeight: 600 }}>eydn AI</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", maxWidth: "78%", fontFamily: "var(--font-body)", fontSize: 13 }}>
          Can you suggest a timeline for DIY centerpieces?
        </div>
        <div style={{ alignSelf: "flex-start", background: "#2A2A3A", color: "#E8D5B7", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.5 }}>
          Based on your 150-guest wedding, I recommend starting 8 weeks out. Order supplies by April 1, do a trial run April 15, then assemble May 10-12.
        </div>
      </div>
    </div>
  );
}

function MiniTaskTimeline() {
  const groups = [
    { phase: "This Week", tasks: [{ t: "Confirm florist contract", s: "urgent" }, { t: "Mail save-the-dates", s: "done" }] },
    { phase: "Next Week", tasks: [{ t: "Cake tasting appointment", s: "upcoming" }, { t: "Book rehearsal dinner venue", s: "upcoming" }] },
  ];
  const statusColor: Record<string, string> = { urgent: "#D4A5A5", done: "#2C3E2D", upcoming: "#C9A84C" };
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7" }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 16 : 0 }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.phase}</p>
          {g.tasks.map((t, ti) => (
            <div key={ti} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor[t.s], flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#1A1A2E", textDecoration: t.s === "done" ? "line-through" : "none" }}>{t.t}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MiniBudgetTracker() {
  const rows = [
    { cat: "Venue", est: "$12,000", paid: "$6,000", pct: 50 },
    { cat: "Catering", est: "$8,500", paid: "$2,000", pct: 24 },
    { cat: "Photography", est: "$3,200", paid: "$1,600", pct: 50 },
    { cat: "Florals", est: "$2,800", paid: "$0", pct: 0 },
  ];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 380, border: "1px solid #E8D5B7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>Total Budget</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#2C3E2D" }}>$26,500</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: 12.5, color: "#1A1A2E", marginBottom: 4 }}>
            <span>{r.cat}</span>
            <span style={{ color: "#6B6B6B" }}>{r.paid} / {r.est}</span>
          </div>
          <div style={{ height: 5, borderRadius: 100, background: "#EDE7DF" }}>
            <div style={{ height: "100%", borderRadius: 100, background: "#2C3E2D", width: `${r.pct}%`, transition: "width 300ms" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniGuestList() {
  const guests = [
    { name: "Emma Johnson", rsvp: "Confirmed", color: "#2E7D4F", bg: "#D6F5E3" },
    { name: "David Chen", rsvp: "Pending", color: "#8A5200", bg: "#FFF3CC" },
    { name: "Sarah Williams", rsvp: "Confirmed", color: "#2E7D4F", bg: "#D6F5E3" },
    { name: "Michael Brown", rsvp: "Declined", color: "#A0204A", bg: "#FFE0EC" },
  ];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px 20px" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase" }}>Guest</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase" }}>RSVP</span>
        {guests.map((g, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#1A1A2E" }}>{g.name}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, background: g.bg, color: g.color, borderRadius: 100, padding: "3px 10px" }}>{g.rsvp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniVendorPipeline() {
  const cols = [
    { label: "Researching", items: ["DJ", "Florist"] },
    { label: "Contacted", items: ["Baker"] },
    { label: "Booked", items: ["Photographer", "Venue"] },
  ];
  const colColors = ["#FFF3CC", "#E8D5B7", "#D6F5E3"];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 380, border: "1px solid #E8D5B7" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {cols.map((c, ci) => (
          <div key={ci}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B6B6B", marginBottom: 8, textTransform: "uppercase" }}>{c.label}</p>
            {c.items.map((item, ii) => (
              <div key={ii} style={{ background: colColors[ci], borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontFamily: "var(--font-body)", fontSize: 12, color: "#1A1A2E" }}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniWeddingSite() {
  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", maxWidth: 360, border: "1px solid #E8D5B7" }}>
      <div style={{ background: "#2C3E2D", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4A5A5" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D6F5E3" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#FAF6F1", marginLeft: 8 }}>eydn.app/w/mark-and-sarah</span>
      </div>
      <div style={{ padding: 20, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-script)", fontSize: 22, color: "#C9A84C" }}>Mark & Sarah</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#1A1A2E", marginTop: 4 }}>September 20, 2026</p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#6B6B6B", marginTop: 6 }}>The Grand Estate, Napa Valley</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          {["Schedule", "Travel", "RSVP", "Registry"].map((l) => (
            <span key={l} style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#2C3E2D", background: "#EDE7DF", borderRadius: 100, padding: "4px 10px" }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniDayOfBinder() {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 340, border: "1px solid #E8D5B7", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #2C3E2D, #C9A84C)", borderRadius: "12px 12px 0 0" }} />
      <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>Day-of Binder</p>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#6B6B6B", marginBottom: 14 }}>Complete wedding guide - PDF</p>
      {["Ceremony Timeline", "Vendor Contact Sheet", "Music & Readings", "Setup Assignments", "Emergency Kit List"].map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 16, height: 2, background: i < 3 ? "#2C3E2D" : "#E8D5B7", borderRadius: 2 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: i < 3 ? "#1A1A2E" : "#6B6B6B" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

const featureVisuals = [MiniAIChat, MiniTaskTimeline, MiniBudgetTracker, MiniGuestList, MiniVendorPipeline, MiniWeddingSite, MiniDayOfBinder];

const featureScriptLabels = [
  "Intelligent planning",
  "Stay on track",
  "Every dollar, accounted for",
  "Everyone, organized",
  "Your dream team",
  "Share your story",
  "The final touch",
];

const featureBullets: string[][] = [
  ["Remembers your style, budget, and decisions", "Personalized advice based on your full wedding data", "Vendor outreach tips and etiquette guidance", "Natural conversation with 50-message memory"],
  ["50+ tasks auto-generated from your date", "Grouped by phase with smart deadlines", "Priority levels and completion tracking", "Reminders so nothing slips through"],
  ["36 pre-built line items across 13 categories", "Track estimated, paid, and final costs", "Link vendors to budget items automatically", "Category subtotals and visual progress"],
  ["RSVPs, meal choices, plus-ones, and groups", "Import guests via CSV in seconds", "Unique RSVP links for each guest", "Addresses and roles management"],
  ["13 vendor categories with status pipeline", "Auto-enriched Google Business profiles", "Contact details, financials, and notes", "Email templates for outreach"],
  ["Custom URL for your guests", "Schedule, travel, registry, and FAQ sections", "Guest photo uploads to shared gallery", "RSVP integration built in"],
  ["Timeline, ceremony script, and music lists", "Per-person schedules for the entire party", "Vendor contacts with arrival times", "Export as a beautiful branded PDF"],
];

/* ── Page ─────────────────────────────────────────────────── */

export default function HomePage() {
  const fontVars = `${cormorant.variable} ${dmSans.variable} ${greatVibes.variable}`;

  return (
    <main className={`flex-1 flex flex-col ${fontVars}`}>
      <style dangerouslySetInnerHTML={{ __html: keyframeCSS }} />

      {/* ─── HERO ─── */}
      <section style={{ minHeight: "100vh", display: "flex" }}>
        {/* Left Column */}
        <div
          style={{
            flex: "0 0 55%",
            background: "var(--whisper)",
            display: "flex",
            alignItems: "center",
            padding: "80px 60px 80px 80px",
          }}
          className="max-lg:!flex-[1_1_100%] max-lg:!p-8 max-lg:!pt-20"
        >
          <div style={{ maxWidth: 600 }}>
            <ScrollReveal>
              <p style={{ fontFamily: "var(--font-script)", fontSize: 26, color: "var(--petal)" }}>
                Your wedding, beautifully planned
              </p>
            </ScrollReveal>
            <ScrollReveal>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 88,
                  fontWeight: 700,
                  color: "var(--violet)",
                  lineHeight: 1.02,
                  marginTop: 16,
                }}
                className="max-lg:!text-[48px]"
              >
                Plan your wedding,
                <br />
                not your stress.
              </h1>
            </ScrollReveal>
            <ScrollReveal>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--muted-plum)", lineHeight: 1.65, marginTop: 28, maxWidth: 480 }}>
                From guest lists to vendor outreach to your day-of binder — everything in one beautiful place, guided by an AI that knows your wedding inside and out.
              </p>
            </ScrollReveal>
            <ScrollReveal>
              <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                <Show when="signed-out">
                  <SignUpButton>
                    <button
                      style={{
                        background: "var(--violet)",
                        color: "var(--whisper)",
                        borderRadius: 100,
                        padding: "16px 36px",
                        fontFamily: "var(--font-body)",
                        fontSize: 15,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 200ms",
                      }}
                    >
                      Start Planning Today
                    </button>
                  </SignUpButton>
                  <Link
                    href="/#how-it-works"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--violet)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>&rarr;</span> See how it works
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    style={{
                      background: "var(--violet)",
                      color: "var(--whisper)",
                      borderRadius: 100,
                      padding: "16px 36px",
                      fontFamily: "var(--font-body)",
                      fontSize: 15,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Go to Dashboard
                  </Link>
                </Show>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <p style={{ marginTop: 24, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted-plum)", letterSpacing: "0.02em" }}>
                50+ Tasks &middot; AI That Knows You &middot; $79 One-Time
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Right Column */}
        <div
          style={{
            flex: "0 0 45%",
            background: "var(--violet)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            padding: 40,
          }}
          className="max-lg:!hidden"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
            <HeroTaskCard />
            <HeroBudgetCard />
            <HeroAIChatCard />
          </div>
        </div>

        {/* Mobile cards band */}
        <div
          className="lg:hidden"
          style={{
            display: "none",
          }}
        />
      </section>

      {/* Mobile hero cards band — shown below hero left on small screens */}
      <div
        className="lg:!hidden"
        style={{
          background: "var(--violet)",
          padding: "40px 20px",
          display: "flex",
          gap: 16,
          overflowX: "auto",
          maxHeight: 380,
          alignItems: "center",
        }}
      >
        <HeroTaskCard />
        <HeroBudgetCard />
        <HeroAIChatCard />
      </div>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <ScrollReveal>
        <section style={{ background: "var(--petal)", padding: "20px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Overlapping avatars */}
            <div style={{ display: "flex", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={n}
                  src={`https://i.pravatar.cc/72?img=${n + 10}`}
                  alt=""
                  width={36}
                  height={36}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2px solid var(--petal)",
                    marginLeft: n > 1 ? -8 : 0,
                    objectFit: "cover",
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--deep-plum)" }}>
              Join 2,400+ couples planning smarter
            </p>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#C9A84C" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── FEATURES — Alternating full-width rows ─── */}
      <section id="features">
        {features.slice(0, 7).map((f, i) => {
          const isForest = i % 2 !== 0;
          const bg = isForest ? "var(--violet)" : "var(--whisper)";
          const textColor = isForest ? "var(--whisper)" : "var(--deep-plum)";
          const mutedColor = isForest ? "rgba(250,246,241,0.6)" : "var(--muted-plum)";
          const VisualComponent = featureVisuals[i];
          const scriptLabel = featureScriptLabels[i];
          const bullets = featureBullets[i];
          const num = String(i + 1).padStart(2, "0");

          return (
            <div key={f.title} style={{ background: bg, padding: "100px 0", position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  maxWidth: 1200,
                  margin: "0 auto",
                  padding: "0 40px",
                  display: "flex",
                  alignItems: "center",
                  gap: 60,
                  flexDirection: i % 2 === 0 ? "row" : "row-reverse",
                  flexWrap: "wrap",
                }}
                className="max-lg:!flex-col max-lg:!gap-10"
              >
                {/* Text panel */}
                <div style={{ flex: "1 1 50%", position: "relative", minWidth: 300 }}>
                  {/* Large decorative number */}
                  <span
                    style={{
                      position: "absolute",
                      top: -40,
                      left: -10,
                      fontFamily: "var(--font-display)",
                      fontSize: 180,
                      fontWeight: 700,
                      color: isForest ? "rgba(250,246,241,0.06)" : "rgba(44,62,45,0.06)",
                      lineHeight: 1,
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {num}
                  </span>
                  <ScrollReveal>
                    <p style={{ fontFamily: "var(--font-script)", fontSize: 24, color: "var(--soft-violet)", position: "relative", zIndex: 1 }}>{scriptLabel}</p>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 48,
                        fontWeight: 700,
                        color: textColor,
                        lineHeight: 1.1,
                        marginTop: 8,
                        position: "relative",
                        zIndex: 1,
                      }}
                      className="max-lg:!text-[36px]"
                    >
                      {f.title}
                    </h3>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: mutedColor, lineHeight: 1.7, marginTop: 16, position: "relative", zIndex: 1 }}>
                      {f.description}
                    </p>
                    <ul style={{ marginTop: 20, listStyle: "none", padding: 0 }}>
                      {bullets.map((b) => (
                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, position: "relative", zIndex: 1 }}>
                          <span style={{ color: "var(--soft-violet)", fontSize: 14, flexShrink: 0, marginTop: 2 }}>&#10022;</span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: textColor, lineHeight: 1.6 }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollReveal>
                </div>
                {/* Visual panel */}
                <div style={{ flex: "1 1 45%", display: "flex", justifyContent: "center", minWidth: 280 }}>
                  <ScrollReveal>
                    <VisualComponent />
                  </ScrollReveal>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <ScrollReveal>
        <section id="how-it-works" style={{ background: "var(--violet)", padding: "120px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 28, color: "var(--soft-violet)" }}>Simple by design</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 700, color: "var(--whisper)", lineHeight: 1.1, marginTop: 8 }} className="max-lg:!text-[40px]">
              From &ldquo;yes&rdquo; to &ldquo;I do&rdquo;
            </h2>

            <div
              style={{
                marginTop: 80,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 40,
                position: "relative",
              }}
              className="max-md:!grid-cols-1 max-md:!gap-16"
            >
              {/* Connecting dashed line — hidden on mobile */}
              <div
                className="max-md:!hidden"
                style={{
                  position: "absolute",
                  top: 40,
                  left: "calc(16.67% + 40px)",
                  right: "calc(16.67% + 40px)",
                  height: 0,
                  borderTop: "2px dashed rgba(201,168,76,0.4)",
                }}
              />
              {steps.map((s, i) => (
                <div key={s.title} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      border: "2px solid var(--soft-violet)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 700,
                      color: "var(--soft-violet)",
                      background: "var(--violet)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--whisper)", marginTop: 24 }}>{s.title}</h3>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(250,246,241,0.6)", lineHeight: 1.65, marginTop: 12 }}>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── TESTIMONIALS ─── */}
      <ScrollReveal>
        <section style={{ background: "var(--whisper)", padding: "120px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 28, color: "var(--soft-violet)" }}>Real couples, real love</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 700, color: "var(--deep-plum)", lineHeight: 1.1, marginTop: 8 }} className="max-lg:!text-[40px]">
              What couples are saying
            </h2>

            <div
              style={{
                marginTop: 60,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 28,
              }}
              className="max-lg:!grid-cols-1 max-lg:!max-w-md max-lg:!mx-auto"
            >
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--blush-pink)",
                    borderRadius: 16,
                    padding: "36px 28px",
                    textAlign: "left",
                    transition: "transform 300ms, box-shadow 300ms",
                    cursor: "default",
                  }}
                  className="hover:-translate-y-2 hover:shadow-xl"
                >
                  {/* Stars */}
                  <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#C9A84C" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  {/* Quote */}
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", color: "var(--deep-plum)", lineHeight: 1.5 }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  {/* Divider */}
                  <div style={{ width: 40, height: 1, background: "rgba(26,26,46,0.2)", margin: "24px 0 20px" }} />
                  {/* Author */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.pravatar.cc/80?img=${i + 20}`}
                      alt=""
                      width={40}
                      height={40}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.5)" }}
                    />
                    <div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--deep-plum)" }}>{t.names}</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(26,26,46,0.6)" }}>{t.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── PRICING ─── */}
      <ScrollReveal>
        <section id="pricing" style={{ background: "var(--whisper)", padding: "120px 24px 80px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 28, color: "var(--soft-violet)" }}>One price, forever yours</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 700, color: "var(--deep-plum)", lineHeight: 1.1, marginTop: 8 }} className="max-lg:!text-[40px]">
              One price. Your whole wedding.
            </h2>

            {/* Main pricing card */}
            <div
              style={{
                marginTop: 48,
                borderRadius: 20,
                padding: 3,
                background: "linear-gradient(135deg, var(--soft-violet), var(--violet), var(--soft-violet))",
                backgroundSize: "200% auto",
                animation: "shimmer 4s linear infinite",
              }}
            >
              <div style={{ background: "var(--violet)", borderRadius: 17, padding: "52px 40px" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(250,246,241,0.5)" }}>Full Access</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 104, fontWeight: 700, color: "var(--soft-violet)", lineHeight: 1, marginTop: 8 }} className="max-sm:!text-[72px]">
                  $79
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(250,246,241,0.5)", marginTop: 8 }}>One-time payment &middot; 1 wedding &middot; Forever</p>

                {/* Two-column feature list */}
                <div
                  style={{
                    marginTop: 40,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 24px",
                    textAlign: "left",
                  }}
                  className="max-sm:!grid-cols-1"
                >
                  {pricingFeatures.map((pf) => (
                    <div key={pf} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ color: "var(--soft-violet)", fontSize: 13, flexShrink: 0, marginTop: 2 }}>&#10022;</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--whisper)", lineHeight: 1.5 }}>{pf}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ marginTop: 44 }}>
                  <Show when="signed-out">
                    <SignUpButton>
                      <button
                        style={{
                          background: "var(--soft-violet)",
                          color: "var(--deep-plum)",
                          borderRadius: 100,
                          padding: "18px 48px",
                          fontFamily: "var(--font-body)",
                          fontSize: 16,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 200ms",
                        }}
                      >
                        Start Planning Today
                      </button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <Link
                      href="/dashboard"
                      style={{
                        display: "inline-block",
                        background: "var(--soft-violet)",
                        color: "var(--deep-plum)",
                        borderRadius: 100,
                        padding: "18px 48px",
                        fontFamily: "var(--font-body)",
                        fontSize: 16,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Go to Dashboard
                    </Link>
                  </Show>
                </div>
              </div>
            </div>

            {/* Quote below pricing */}
            <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic", color: "var(--muted-plum)", marginTop: 40, lineHeight: 1.6 }}>
              &ldquo;Most couples spend $35,000+ on their wedding. A $79 planning tool that keeps you organized and on budget is the best investment you can make.&rdquo;
            </p>

            {/* Memory Plan */}
            <div
              style={{
                marginTop: 40,
                background: "var(--blush-pink)",
                borderRadius: 16,
                padding: "32px 36px",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--deep-plum)" }}>Memory Plan</p>
                <div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--deep-plum)" }}>$29</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--muted-plum)", marginLeft: 4 }}>/year</span>
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--muted-plum)", marginTop: 8, lineHeight: 1.6 }}>
                Keep your wedding website live and your data accessible after the wedding.
              </p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {memoryPlanFeatures.map((mf) => (
                  <div key={mf} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--soft-violet)", fontSize: 13 }}>&#10022;</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--deep-plum)" }}>{mf}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── FINAL CTA ─── */}
      <ScrollReveal>
        <section
          style={{
            background: "var(--violet)",
            padding: "140px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 50% 50%, rgba(201,168,76,0.15) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 30, color: "var(--soft-violet)" }}>Begin your story</p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 72,
                fontWeight: 700,
                color: "var(--whisper)",
                lineHeight: 1.08,
                marginTop: 12,
              }}
              className="max-lg:!text-[48px]"
            >
              Your story deserves to be told beautifully.
            </h2>
            <div style={{ marginTop: 44 }}>
              <Show when="signed-out">
                <SignUpButton>
                  <button
                    style={{
                      background: "var(--soft-violet)",
                      color: "var(--deep-plum)",
                      borderRadius: 100,
                      padding: "18px 48px",
                      fontFamily: "var(--font-body)",
                      fontSize: 16,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 200ms",
                    }}
                  >
                    Start Planning Today
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  style={{
                    display: "inline-block",
                    background: "var(--soft-violet)",
                    color: "var(--deep-plum)",
                    borderRadius: 100,
                    padding: "18px 48px",
                    fontFamily: "var(--font-body)",
                    fontSize: 16,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Go to Dashboard
                </Link>
              </Show>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── FOOTER ─── */}
      <footer style={{ backgroundColor: "#1A1A2E", padding: "80px 24px 48px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 40,
            }}
            className="max-md:!grid-cols-2 max-sm:!grid-cols-1"
          >
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#fff" }}>eydn</p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginTop: 12 }}>
                Your AI-powered wedding planning guide. From engagement to &ldquo;I do.&rdquo;
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Product</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/#features" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Features</Link>
                <Link href="/#pricing" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Pricing</Link>
                <Link href="/#how-it-works" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>How It Works</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em" }}>For Vendors</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/dashboard/vendor-portal" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Vendor Portal</Link>
                <Link href="/#pricing" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Placement Tiers</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Company</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="mailto:support@eydn.app" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Contact</a>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>&copy; {new Date().getFullYear()} eydn. All rights reserved.</p>
            <div style={{ display: "flex", gap: 24 }}>
              <Link href="/privacy" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</Link>
              <Link href="/terms" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Data ────────────────────────────────────────────────── */

const features = [
  { title: "AI assistant that remembers you", description: "Chat with eydn for personalized advice — it knows your style, allergies, budget priorities, and every decision you've made. Like a planner who never forgets." },
  { title: "Smart task timeline", description: "50+ tasks auto-generated from your wedding date. Grouped by phase, with deadlines, priorities, and reminders." },
  { title: "Budget tracker", description: "Track estimated costs, payments, and final costs by category. Link vendors to line items automatically." },
  { title: "Guest management", description: "RSVPs, meal preferences, roles, addresses, plus-ones, and groups. Import via CSV. Send RSVP links." },
  { title: "Vendor tracker with Google profiles", description: "Manage 13 vendor categories with status pipeline, contacts, financials, email templates, and auto-enriched Google Business profiles with ratings and reviews." },
  { title: "Wedding website", description: "A beautiful public page for your guests with schedule, travel info, registry links, photo gallery, and RSVP." },
  { title: "Complete day-of binder", description: "Timeline, ceremony script, music lists, speeches, setup assignments, attire details, vendor contacts, and packing checklist — all exportable as a beautiful branded PDF." },
  { title: "Seating chart", description: "Drag-and-drop tables for your reception. Ceremony layout for who stands where at the altar." },
  { title: "Photo gallery", description: "Guests upload their photos to a shared album right from your wedding website. No app download needed." },
  { title: "Your data, protected", description: "Daily encrypted backups, soft-delete recovery, full data export, and audit logging. Your wedding plans are never at risk." },
];

const steps = [
  { title: "Tell us about your wedding", description: "Complete a quick 11-step guided setup. eydn learns your date, budget, style, and what you've already booked." },
  { title: "Get your personalized plan", description: "eydn generates 50+ tasks with real deadlines, a pre-built budget with line items, and a custom planning timeline." },
  { title: "Plan with confidence", description: "Track vendors, manage guests, build your seating chart, and chat with eydn whenever you need advice." },
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

const testimonials = [
  {
    quote: "We were overwhelmed before eydn. Having everything — tasks, budget, vendors, guests — in one place with an AI that actually remembered our preferences changed everything.",
    names: "Priya & James",
    detail: "Married June 2025 \u00B7 Chicago, IL",
  },
  {
    quote: "The day-of binder alone was worth it. Our coordinator said it was the most organized couple she'd ever worked with.",
    names: "Sarah & Michael",
    detail: "Married Sept 2025 \u00B7 Austin, TX",
  },
  {
    quote: "I almost spent $3,000 on a wedding planner. eydn did everything I needed for $79. I cannot believe this is a one-time payment.",
    names: "Lauren & Chris",
    detail: "Married May 2025 \u00B7 Denver, CO",
  },
];
