"use client";

import Link from "next/link";
import { Show, SignUpButton, useAuth } from "@clerk/nextjs";
import { Cormorant_Garamond, DM_Sans, Great_Vibes } from "next/font/google";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ── Fonts ───────────────────────────────────────────────── */

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-script",
});

/* ── ScrollReveal ────────────────────────────────────────── */

function ScrollReveal({
  children,
  className = "",
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip animation for above-fold content — render immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("sr-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const initialTransform =
    direction === "left"
      ? "translateX(-40px)"
      : direction === "right"
        ? "translateX(40px)"
        : "translateY(28px)";

  return (
    <div
      ref={ref}
      className={`sr-reveal ${className}`}
      style={{
        opacity: 0,
        transform: initialTransform,
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
  transform: translate(0, 0) !important;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes float1 {
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
}
@media (prefers-reduced-motion: reduce) {
  .sr-reveal { transition: none !important; }
  .sr-visible { opacity: 1 !important; transform: none !important; transition: none !important; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

/* ── Landing Nav ────────────────────────────────────────── */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
  ];

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          background: scrolled ? "rgba(250,246,241,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid var(--champagne, #E8D5B7)" : "1px solid transparent",
          transition: "background 0.35s, border-bottom 0.35s, backdrop-filter 0.35s",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Nav links (left) */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="eydn" decoding="async" style={{ height: 30 }} />
          </Link>
          <nav
            style={{ display: "flex", alignItems: "center", gap: 24 }}
            className="max-md:!hidden"
          >
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: "#2A2018",
                  opacity: 0.75,
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.75"; }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side: auth-aware buttons */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 16 }}
          className="max-md:!hidden"
        >
          {isSignedIn ? (
            <Link
              href="/dashboard"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 600,
                color: "#FAF6F1",
                background: "#2C3E2D",
                borderRadius: 100,
                padding: "8px 20px",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3A5240"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2C3E2D"; }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2A2018",
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#FAF6F1",
                  background: "#2C3E2D",
                  borderRadius: 100,
                  padding: "8px 20px",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#3A5240"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#2C3E2D"; }}
              >
                Start Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile right side */}
        <div className="md:!hidden flex items-center gap-3">
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-in"}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              color: isSignedIn ? "#FAF6F1" : "#2A2018",
              background: isSignedIn ? "#2C3E2D" : "transparent",
              borderRadius: 100,
              padding: isSignedIn ? "6px 16px" : "0",
              textDecoration: "none",
            }}
          >
            {isSignedIn ? "Dashboard" : "Sign In"}
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:!hidden"
          onClick={() => setMobileMenuOpen(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
          aria-label="Open menu"
        >
          <span style={{ display: "block", width: 22, height: 2, background: "#2A2018", borderRadius: 2 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#2A2018", borderRadius: 2 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#2A2018", borderRadius: 2 }} />
        </button>
      </nav>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#2C3E2D",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
            }}
            aria-label="Close menu"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" stroke="#FAF6F1" strokeWidth="2" strokeLinecap="round" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {navLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                color: "#FAF6F1",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Show when="signed-out">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                color: "#FAF6F1",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 16,
                fontWeight: 600,
                color: "#2C3E2D",
                background: "#FAF6F1",
                borderRadius: 100,
                padding: "14px 36px",
                textDecoration: "none",
                marginTop: 8,
              }}
            >
              Start Free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                color: "#FAF6F1",
                textDecoration: "none",
              }}
            >
              Dashboard
            </Link>
          </Show>
        </div>
      )}
    </>
  );
}

/* ── Botanical SVG Watermarks ────────────────────────────── */

function BotanicalOverlay({ color = "#D4A5A5", opacity = 0.1 }: { color?: string; opacity?: number }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity }}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {/* Leaf cluster top-right */}
      <g transform="translate(600,80) rotate(25)">
        <ellipse cx="0" cy="0" rx="60" ry="18" fill={color} />
        <ellipse cx="-20" cy="-30" rx="50" ry="14" fill={color} transform="rotate(-30)" />
        <ellipse cx="20" cy="-25" rx="45" ry="12" fill={color} transform="rotate(20)" />
        <line x1="0" y1="18" x2="0" y2="60" stroke={color} strokeWidth="2" />
      </g>
      {/* Leaf cluster bottom-left */}
      <g transform="translate(120,480) rotate(-15)">
        <ellipse cx="0" cy="0" rx="55" ry="16" fill={color} />
        <ellipse cx="25" cy="-28" rx="48" ry="13" fill={color} transform="rotate(35)" />
        <ellipse cx="-15" cy="-22" rx="40" ry="11" fill={color} transform="rotate(-25)" />
        <line x1="0" y1="16" x2="0" y2="55" stroke={color} strokeWidth="2" />
      </g>
      {/* Small accent leaves */}
      <g transform="translate(350,120) rotate(45)">
        <ellipse cx="0" cy="0" rx="30" ry="10" fill={color} />
        <ellipse cx="10" cy="-15" rx="25" ry="8" fill={color} transform="rotate(20)" />
      </g>
      <g transform="translate(680,420) rotate(-40)">
        <ellipse cx="0" cy="0" rx="35" ry="11" fill={color} />
        <ellipse cx="-12" cy="-18" rx="28" ry="9" fill={color} transform="rotate(-30)" />
      </g>
    </svg>
  );
}

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
        boxShadow: "0 8px 32px rgba(180,140,130,.2)",
        transform: "rotate(-2deg)",
        animation: "float1 5s ease-in-out infinite",
        position: "absolute",
        top: "8%",
        right: "10%",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Task Timeline</p>
      {tasks.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < tasks.length - 1 ? 10 : 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0, opacity: t.done ? 0.5 : 1 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: t.done ? "#B09A87" : "#2A2018", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.label}</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#6B5E50" }}>{t.due}</span>
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
        background: "#2C3E2D",
        borderRadius: 12,
        padding: "18px 20px",
        width: 270,
        boxShadow: "0 12px 40px rgba(0,0,0,.3)",
        transform: "rotate(1deg)",
        animation: "float2 6s ease-in-out infinite",
        position: "absolute",
        top: "38%",
        left: "5%",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Budget Tracker</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 14px", fontFamily: "var(--font-body)", fontSize: 11 }}>
        <span style={{ color: "rgba(250,246,241,0.5)", fontWeight: 600 }}>Category</span>
        <span style={{ color: "rgba(250,246,241,0.5)", fontWeight: 600 }}>Estimated</span>
        <span style={{ color: "rgba(250,246,241,0.5)", fontWeight: 600 }}>Paid</span>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontSize: 13, color: "#FAF6F1" }}>{r.cat}</span>
            <span style={{ fontSize: 13, color: "rgba(250,246,241,0.7)" }}>{r.est}</span>
            <span style={{ fontSize: 13, color: "#C9A84C", fontWeight: 600 }}>{r.paid}</span>
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
        background: "#1A1A2E",
        borderRadius: 12,
        padding: "18px 20px",
        width: 280,
        boxShadow: "0 12px 40px rgba(0,0,0,.3)",
        transform: "rotate(2deg)",
        animation: "float3 7s ease-in-out infinite",
        position: "absolute",
        bottom: "10%",
        right: "8%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #C08080, #C9A84C)" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>eydn AI</span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", marginLeft: "auto" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "12px 12px 4px 12px", padding: "8px 12px", maxWidth: "80%", fontFamily: "var(--font-body)", fontSize: 12.5 }}>
          What should I prioritize this month?
        </div>
        <div style={{ alignSelf: "flex-start", background: "#252B45", color: "rgba(250,246,241,0.85)", borderRadius: "12px 12px 12px 4px", padding: "8px 12px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 12.5, lineHeight: 1.45 }}>
          Focus on booking your <span style={{ color: "#E8C97A", fontWeight: 600 }}>photographer</span> and finalizing the <span style={{ color: "#E8C97A", fontWeight: 600 }}>guest list</span>. Both have March deadlines.
        </div>
      </div>
    </div>
  );
}

/* ── Mini UI Components for Feature Rows ─────────────────── */

function MiniTaskTimeline() {
  const groups = [
    { phase: "This Week", tasks: [{ t: "Confirm florist contract", s: "urgent" }, { t: "Mail save-the-dates", s: "done" }] },
    { phase: "Next Week", tasks: [{ t: "Cake tasting appointment", s: "upcoming" }, { t: "Book rehearsal dinner venue", s: "upcoming" }] },
  ];
  const statusColor: Record<string, string> = { urgent: "#D4A5A5", done: "#2C3E2D", upcoming: "#C9A84C" };
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 16 : 0 }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.phase}</p>
          {g.tasks.map((t, ti) => (
            <div key={ti} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor[t.s], flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018", textDecoration: t.s === "done" ? "line-through" : "none" }}>{t.t}</span>
            </div>
          ))}
          {gi === 0 && (
            <div style={{ height: 4, borderRadius: 100, background: "#F3EAE0", marginTop: 10 }}>
              <div style={{ height: "100%", borderRadius: 100, background: "#2C3E2D", width: "60%" }} />
            </div>
          )}
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
    <div style={{ background: "#1E2E1F", borderRadius: 12, padding: 20, maxWidth: 380, border: "1px solid rgba(201,168,76,0.3)", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#FAF6F1" }}>Total Budget</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#E8C97A" }}>$26,500</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", fontFamily: "var(--font-body)", fontSize: 11, marginBottom: 12 }}>
        <span style={{ color: "rgba(250,246,241,0.5)", fontWeight: 600 }}>Category</span>
        <span style={{ color: "rgba(250,246,241,0.5)", fontWeight: 600 }}>Estimated</span>
        <span style={{ color: "rgba(250,246,241,0.5)", fontWeight: 600 }}>Paid</span>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontSize: 13, color: "#FAF6F1" }}>{r.cat}</span>
            <span style={{ fontSize: 13, color: "rgba(250,246,241,0.7)" }}>{r.est}</span>
            <span style={{ fontSize: 13, color: "#E8C97A", fontWeight: 600 }}>{r.paid}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(250,246,241,0.15)", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 16px", fontFamily: "var(--font-body)", fontSize: 12 }}>
        <span style={{ color: "rgba(250,246,241,0.5)" }}>Total</span>
        <span style={{ color: "rgba(250,246,241,0.7)", fontWeight: 600 }}>$26,500</span>
        <span style={{ color: "#E8C97A", fontWeight: 600 }}>$9,600</span>
      </div>
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
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px 20px" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase" }}>Guest</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase" }}>RSVP</span>
        {guests.map((g, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>{g.name}</span>
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
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 380, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {cols.map((c, ci) => (
          <div key={ci}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", marginBottom: 8, textTransform: "uppercase" }}>{c.label}</p>
            {c.items.map((item, ii) => (
              <div key={ii} style={{ background: colColors[ci], borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontFamily: "var(--font-body)", fontSize: 12, color: "#2A2018" }}>
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
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ background: "#2C3E2D", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4A5A5" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D6F5E3" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#FAF6F1", marginLeft: 8 }}>eydn.app/w/mark-and-sarah</span>
      </div>
      <div style={{ padding: 20, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-script)", fontSize: 22, color: "#C9A84C" }}>Mark & Sarah</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#2A2018", marginTop: 4 }}>September 20, 2026</p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#6B5E50", marginTop: 6 }}>The Grand Estate, Napa Valley</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          {["Schedule", "Travel", "RSVP", "Registry"].map((l) => (
            <span key={l} style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#2C3E2D", background: "#F3EAE0", borderRadius: 100, padding: "4px 10px" }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniDayOfBinder() {
  return (
    <div style={{ background: "#1E2E1F", borderRadius: 12, padding: 20, maxWidth: 340, border: "1px solid rgba(201,168,76,0.3)", position: "relative", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #C9A84C, #E8C97A)", borderRadius: "12px 12px 0 0" }} />
      <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "#FAF6F1", marginBottom: 4 }}>Day-of Binder</p>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(250,246,241,0.5)", marginBottom: 14 }}>Complete wedding guide &middot; PDF</p>
      {["Ceremony Timeline", "Vendor Contact Sheet", "Music & Readings", "Setup Assignments", "Emergency Kit List"].map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 16, height: 2, background: i < 3 ? "#E8C97A" : "rgba(250,246,241,0.2)", borderRadius: 2 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: i < 3 ? "#FAF6F1" : "rgba(250,246,241,0.5)" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function MiniDataSecurity() {
  const items = ["256-bit encryption at rest", "Daily encrypted backups", "Soft-delete recovery (30 days)", "Full data export anytime", "Audit logging"];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F3EAE0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#2A2018" }}>Data Protection</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/* ── AI Spotlight Chat Component ─────────────────────────── */

function SpotlightChat() {
  return (
    <div style={{ background: "#1E2340", borderRadius: 16, padding: 24, maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#FAF6F1", fontWeight: 600 }}>Eydn AI</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "rgba(250,246,241,0.65)", marginLeft: "auto" }}>Online</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "14px 14px 4px 14px", padding: "10px 16px", maxWidth: "78%", fontFamily: "var(--font-body)", fontSize: 13 }}>
          Find me florists near Madison under $3,000
        </div>
        <div style={{ alignSelf: "flex-start", background: "#252B45", color: "#E8D5B7", borderRadius: "14px 14px 14px 4px", padding: "10px 16px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.55 }}>
          I found 3 great options! <span style={{ color: "#E8C97A" }}>Bloom & Petal</span> starts at $2,200 with amazing reviews. Want me to add them to your vendor list?
        </div>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "14px 14px 4px 14px", padding: "10px 16px", maxWidth: "78%", fontFamily: "var(--font-body)", fontSize: 13 }}>
          Yes, add them and mark as contacted
        </div>
        <div style={{ alignSelf: "flex-start", background: "#252B45", color: "#E8D5B7", borderRadius: "14px 14px 14px 4px", padding: "10px 16px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.55 }}>
          Done! <span style={{ color: "#7BC67E" }}>✓</span> Added Bloom &amp; Petal to your vendors <span style={{ color: "#7BC67E" }}>✓</span> Status set to contacted
        </div>
      </div>
      {/* Input bar */}
      <div style={{ marginTop: 16, background: "#1A1A2E", borderRadius: 100, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.55)", flex: 1 }}>Ask Eydn anything...</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8C97A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
    </div>
  );
}

/* ── Feature row config ──────────────────────────────────── */

const featureVisuals = [MiniTaskTimeline, MiniBudgetTracker, MiniGuestList, MiniVendorPipeline, MiniWeddingSite, MiniDayOfBinder, MiniDataSecurity];

const featureScriptLabels = [
  "Stay on track",
  "Every dollar, accounted for",
  "Everyone, organized",
  "Your dream team",
  "Share your story",
  "The final touch",
  "Safe and sound",
];

const featureBullets: string[][] = [
  ["50+ tasks auto-generated from your date", "Grouped by phase with smart deadlines", "Priority levels and completion tracking", "Reminders so nothing slips through"],
  ["36 pre-built line items across 13 categories", "Track estimated, paid, and final costs", "Link vendors to budget items automatically", "Category subtotals and visual progress"],
  ["RSVPs, meal choices, plus-ones, and groups", "Import guests via CSV in seconds", "Unique RSVP links for each guest", "Addresses and roles management"],
  ["13 vendor categories with status pipeline", "Auto-enriched Google Business profiles", "Contact details, financials, and notes", "Email templates for outreach"],
  ["Custom URL for your guests", "Schedule, travel, registry, and FAQ sections", "Guest photo uploads to shared gallery", "RSVP integration built in"],
  ["Timeline, ceremony script, and music lists", "Per-person schedules for the entire party", "Vendor contacts with arrival times", "Export as a beautiful branded PDF"],
  ["256-bit encryption at rest", "Daily encrypted backups with 30-day recovery", "Full data export anytime", "Audit logging for every change"],
];

/* dark row indices: 1 (Budget) and 5 (Day-of Binder) */
const darkRowIndices = new Set([1, 5]);

/* ── Page ─────────────────────────────────────────────────── */

export default function HomePage() {
  const fontVars = `${cormorant.variable} ${dmSans.variable} ${greatVibes.variable}`;

  return (
    <main
      className={`flex-1 flex flex-col ${fontVars}`}
      style={{ animation: "fadeIn 0.6s ease-out", overflowX: "hidden" }}
    >
      <style dangerouslySetInnerHTML={{ __html: keyframeCSS }} />
      <LandingNav />

      {/* ─── HERO ─── */}
      <section style={{ minHeight: "100vh", display: "flex" }}>
        {/* Left Column */}
        <div
          style={{
            flex: "0 0 55%",
            background: "#FAF6F1",
            display: "flex",
            alignItems: "center",
            padding: "80px 60px 80px 80px",
            position: "relative",
            overflow: "hidden",
          }}
          className="max-lg:!flex-[1_1_100%] max-lg:!p-8 max-lg:!pt-20"
        >
          <BotanicalOverlay color="#D4A5A5" opacity={0.08} />
          <BotanicalOverlay color="#C9A84C" opacity={0.05} />
          <div style={{ maxWidth: 600, position: "relative", zIndex: 1 }}>
            <ScrollReveal>
              <p style={{ fontFamily: "var(--font-script)", fontSize: 32, color: "#D4A5A5" }}>
                Your wedding, beautifully planned
              </p>
            </ScrollReveal>
            <ScrollReveal>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 86,
                  fontWeight: 600,
                  color: "#2A2018",
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
              <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "#6B5E50", lineHeight: 1.65, marginTop: 28, maxWidth: 480 }}>
                From guest lists to vendor outreach to your day-of binder — everything in one beautiful place, guided by an AI that knows your wedding inside and out.
              </p>
            </ScrollReveal>
            <ScrollReveal>
              <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                <Show when="signed-out">
                  <SignUpButton>
                    <button
                      style={{
                        background: "#2C3E2D",
                        color: "#FAF6F1",
                        borderRadius: 100,
                        padding: "16px 36px",
                        fontFamily: "var(--font-body)",
                        fontSize: 15,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        transition: "background 200ms",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#C08080"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#2C3E2D"; }}
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
                      color: "#2C3E2D",
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
                      background: "#2C3E2D",
                      color: "#FAF6F1",
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
              <p style={{ marginTop: 24, fontFamily: "var(--font-body)", fontSize: 13, color: "#6B5E50", letterSpacing: "0.02em" }}>
                <span style={{ color: "#C9A84C" }}>&#10022;</span> 50+ Tasks &middot;{" "}
                <span style={{ color: "#C9A84C" }}>&#10022;</span> AI That Knows You &middot;{" "}
                <span style={{ color: "#C9A84C" }}>&#10022;</span> $79 One-Time
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Right Column — warm gradient */}
        <div
          style={{
            flex: "0 0 45%",
            background: "linear-gradient(145deg, #F7EDED 0%, #F0E4CC 40%, #F3EAE0 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            padding: 40,
          }}
          className="max-lg:!hidden"
        >
          <BotanicalOverlay color="#D4A5A5" opacity={0.1} />
          <BotanicalOverlay color="#C9A84C" opacity={0.06} />
          <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 500 }}>
            <HeroTaskCard />
            <HeroBudgetCard />
            <HeroAIChatCard />
          </div>
        </div>
      </section>

      {/* Mobile hero cards band */}
      <div
        className="lg:!hidden"
        role="region"
        aria-label="Feature preview cards"
        style={{
          background: "linear-gradient(145deg, #F7EDED 0%, #F0E4CC 40%, #F3EAE0 100%)",
          padding: "40px 20px",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:overflow-x-auto sm:items-center" style={{ scrollbarWidth: "none" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 8px 32px rgba(180,140,130,.2)" }} className="sm:min-w-[260px] sm:flex-shrink-0">
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Task Timeline</p>
          {[{ label: "Book photographer", done: true }, { label: "Finalize guest list", done: false }, { label: "Cake tasting", done: false }].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.done ? "#B09A87" : "#C9A84C", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: t.done ? "#B09A87" : "#2A2018", textDecoration: t.done ? "line-through" : "none" }}>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 8px 32px rgba(180,140,130,.2)" }} className="sm:min-w-[260px] sm:flex-shrink-0">
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Budget</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>$9,600 of $26,500 paid</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 8px 32px rgba(180,140,130,.2)" }} className="sm:min-w-[260px] sm:flex-shrink-0">
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>AI Chat</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>Ask Eydn anything</p>
        </div>
        </div>
      </div>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <ScrollReveal>
        <section style={{ background: "#F7EDED", padding: "20px 24px" }}>
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
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2px solid #F7EDED",
                    marginLeft: n > 1 ? -8 : 0,
                    objectFit: "cover",
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "#2A2018" }}>
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

      {/* ─── FEATURES — 7 alternating rows ─── */}
      <section id="features">
        {features.slice(0, 7).map((f, i) => {
          const isDark = darkRowIndices.has(i);
          const textPanelBg = isDark ? "#2C3E2D" : "#F7EDED";
          const visualPanelBg = isDark ? "#233124" : "#F0E4CC";
          const textColor = isDark ? "#FAF6F1" : "#2A2018";
          const mutedColor = isDark ? "rgba(250,246,241,0.6)" : "#8A7A6A";
          const scriptColor = isDark ? "#E8C97A" : "#C08080";
          const bulletColor = isDark ? "#E8C97A" : "#C9A84C";
          const numColor = isDark ? "rgba(250,246,241,0.05)" : "rgba(42,32,24,0.05)";
          const VisualComponent = featureVisuals[i];
          const scriptLabel = featureScriptLabels[i];
          const bullets = featureBullets[i];
          const num = String(i + 1).padStart(2, "0");
          const isEven = i % 2 === 0;

          return (
            <div key={f.title} style={{ display: "flex", minHeight: 540 }} className="max-lg:!flex-col">
              {/* Text panel */}
              <div
                style={{
                  flex: "0 0 50%",
                  background: textPanelBg,
                  display: "flex",
                  alignItems: "center",
                  padding: "80px 60px",
                  position: "relative",
                  overflow: "hidden",
                  order: isEven ? 0 : 1,
                }}
                className="max-lg:!order-none max-lg:!p-10"
              >
                {/* Large decorative number */}
                <span
                  style={{
                    position: "absolute",
                    top: -20,
                    left: 20,
                    fontFamily: "var(--font-display)",
                    fontSize: 190,
                    fontWeight: 600,
                    color: numColor,
                    lineHeight: 1,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {num}
                </span>
                <ScrollReveal direction={isEven ? "right" : "left"}>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <p style={{ fontFamily: "var(--font-script)", fontSize: 26, color: scriptColor }}>{scriptLabel}</p>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 48,
                        fontWeight: 600,
                        color: textColor,
                        lineHeight: 1.1,
                        marginTop: 8,
                      }}
                      className="max-lg:!text-[36px]"
                    >
                      {f.title}
                    </h3>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: mutedColor, lineHeight: 1.7, marginTop: 16 }}>
                      {f.description}
                    </p>
                    <ul style={{ marginTop: 20, listStyle: "none", padding: 0 }}>
                      {bullets.map((b) => (
                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <span style={{ color: bulletColor, fontSize: 14, flexShrink: 0, marginTop: 2 }}>&#10022;</span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: textColor, lineHeight: 1.6 }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              </div>
              {/* Visual panel */}
              <div
                style={{
                  flex: "0 0 50%",
                  background: visualPanelBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 40px",
                  order: isEven ? 1 : 0,
                }}
                className="max-lg:!order-none max-lg:!p-10"
              >
                <ScrollReveal direction={isEven ? "left" : "right"}>
                  <VisualComponent />
                </ScrollReveal>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <ScrollReveal>
        <section id="how-it-works" style={{ background: "#2C3E2D", padding: "120px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 28, color: "#E8C97A" }}>Simple by design</p>
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: 60, fontWeight: 600, color: "#FAF6F1", lineHeight: 1.1, marginTop: 8 }}
              className="max-lg:!text-[40px]"
            >
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
              {/* Connecting dashed line */}
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
                      border: "2px solid #E8D5B7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 600,
                      color: "#E8D5B7",
                      background: "#2C3E2D",
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "#FAF6F1", marginTop: 24 }}>{s.title}</h3>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(250,246,241,0.6)", lineHeight: 1.65, marginTop: 12 }}>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── AI SPOTLIGHT ─── */}
      <section style={{ display: "flex", minHeight: 600 }} className="max-lg:!flex-col">
        {/* Left: dark panel with chat */}
        <div
          style={{
            flex: "0 0 50%",
            background: "linear-gradient(165deg, #1A1A2E 0%, #0F1525 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 40px",
          }}
          className="max-lg:!p-10"
        >
          <ScrollReveal>
            <SpotlightChat />
          </ScrollReveal>
        </div>
        {/* Right: blush-pale with text */}
        <div
          style={{
            flex: "0 0 50%",
            background: "#F7EDED",
            display: "flex",
            alignItems: "center",
            padding: "80px 60px",
          }}
          className="max-lg:!p-10"
        >
          <ScrollReveal>
            <div>
              <p style={{ fontFamily: "var(--font-script)", fontSize: 26, color: "#C08080" }}>Intelligent planning</p>
              <h2
                style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 600, color: "#2A2018", lineHeight: 1.1, marginTop: 8 }}
                className="max-lg:!text-[36px]"
              >
                An AI planner that actually does things
              </h2>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "#6B5E50", lineHeight: 1.7, marginTop: 20 }}>
                Eydn isn&apos;t just a chatbot. It sees your full wedding — every guest, vendor, task, and budget line — and takes action when you ask. Add guests, book vendors, search for venues, and get personalized advice, all through conversation.
              </p>
              <ul style={{ marginTop: 24, listStyle: "none", padding: 0 }}>
                {[
                  "Takes real actions — adds guests, updates vendors, completes tasks",
                  "Searches the web for vendors, venues, and pricing in your area",
                  "Knows your full wedding data — budget, timeline, guest list, preferences",
                  "Proactive nudges — surfaces what needs attention before you ask",
                  "Generates vendor briefs from your planning guide answers",
                ].map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: "#C9A84C", fontSize: 14, flexShrink: 0, marginTop: 2 }}>&#10022;</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#2A2018", lineHeight: 1.6 }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <ScrollReveal>
        <section style={{ background: "#FAF6F1", padding: "120px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 28, color: "#C08080" }}>Real couples, real love</p>
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 600, color: "#2A2018", lineHeight: 1.1, marginTop: 8 }}
              className="max-lg:!text-[40px]"
            >
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
              {testimonials.map((t, i) => {
                const gradients = [
                  "linear-gradient(135deg, #D4A5A5, #C08080)",
                  "linear-gradient(135deg, #E8D5B7, #C9A84C)",
                  "linear-gradient(135deg, #D4A5A5, #C08080)",
                ];
                const initials = t.names.split(" & ").map((n) => n[0]).join("&");
                return (
                  <div
                    key={i}
                    style={{
                      background: "#F7EDED",
                      borderRadius: 16,
                      padding: "36px 28px",
                      textAlign: "left",
                      transition: "transform 300ms, box-shadow 300ms",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-7px)";
                      e.currentTarget.style.boxShadow = "0 16px 48px rgba(180,140,130,.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
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
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", color: "#2A2018", lineHeight: 1.5 }}>
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    {/* Divider */}
                    <div style={{ width: 40, height: 1, background: "rgba(42,32,24,0.15)", margin: "24px 0 20px" }} />
                    {/* Author */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: gradients[i],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-body)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#2A2018" }}>{t.names}</p>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#6B5E50" }}>{t.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── PRICING ─── */}
      <ScrollReveal>
        <section id="pricing" style={{ background: "#F7EDED", padding: "120px 24px 80px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 28, color: "#D4A5A5" }}>One investment</p>
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: 60, fontWeight: 600, color: "#2A2018", lineHeight: 1.1, marginTop: 8 }}
              className="max-lg:!text-[40px]"
            >
              One price. Your whole wedding.
            </h2>

            {/* Main pricing card */}
            <div
              style={{
                marginTop: 48,
                borderRadius: 20,
                padding: 3,
                background: "linear-gradient(135deg, #C9A84C, #E8C97A, #C9A84C)",
                backgroundSize: "200% auto",
                animation: "shimmer 4s linear infinite",
              }}
            >
              <div style={{ background: "#2C3E2D", borderRadius: 17, padding: "52px 40px" }}>
                <p style={{ fontFamily: "var(--font-script)", fontSize: 22, color: "#E8C97A" }}>Full access, forever</p>
                <p
                  style={{ fontFamily: "var(--font-display)", fontSize: 96, fontWeight: 600, color: "#C9A84C", lineHeight: 1, marginTop: 8 }}
                  className="max-sm:!text-[72px]"
                >
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
                      <span style={{ color: "#E8C97A", fontSize: 13, flexShrink: 0, marginTop: 2 }}>&#10022;</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#FAF6F1", lineHeight: 1.5 }}>{pf}</span>
                    </div>
                  ))}
                </div>

                {/* CTA — blush to rose gradient */}
                <div style={{ marginTop: 44 }}>
                  <Show when="signed-out">
                    <SignUpButton>
                      <button
                        style={{
                          background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                          color: "#fff",
                          borderRadius: 100,
                          padding: "18px 48px",
                          fontFamily: "var(--font-body)",
                          fontSize: 16,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 200ms",
                          boxShadow: "0 4px 20px rgba(192,128,128,0.4)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 8px 32px rgba(192,128,128,0.6)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 20px rgba(192,128,128,0.4)";
                          e.currentTarget.style.transform = "translateY(0)";
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
                        background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                        color: "#fff",
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
            <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic", color: "#6B5E50", marginTop: 40, lineHeight: 1.6 }}>
              &ldquo;Most couples spend $35,000+ on their wedding. A $79 planning tool that keeps you organized and on budget is the best investment you can make.&rdquo;
            </p>

            {/* Memory Plan */}
            <div
              style={{
                marginTop: 40,
                background: "#fff",
                borderRadius: 16,
                padding: "32px 36px",
                textAlign: "left",
                border: "1px solid #D4A5A5",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontFamily: "var(--font-script)", fontSize: 20, color: "#C08080" }}>After the day</p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "#2A2018", marginTop: 4 }}>Memory Plan</p>
                </div>
                <div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "#2A2018" }}>$29</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#6B5E50", marginLeft: 4 }}>/year</span>
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#6B5E50", marginTop: 8, lineHeight: 1.6 }}>
                Keep your wedding website live and your data accessible after the wedding.
              </p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {memoryPlanFeatures.map((mf) => (
                  <div key={mf} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#C9A84C", fontSize: 13 }}>&#10022;</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>{mf}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── FLORAL DIVIDER ─── */}
      <div style={{ width: "100%", overflow: "hidden", lineHeight: 0, background: "#F7EDED" }}>
        <svg viewBox="0 0 1200 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: 60 }}>
          <path d="M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30" stroke="#E8D5B7" strokeWidth="1" fill="none" />
          <path d="M0 35 Q150 5 300 35 T600 35 T900 35 T1200 35" stroke="#D4A5A5" strokeWidth="0.5" fill="none" opacity="0.5" />
          {/* Decorative dots at peaks */}
          <circle cx="150" cy="15" r="3" fill="#C9A84C" opacity="0.6" />
          <circle cx="450" cy="15" r="2" fill="#D4A5A5" opacity="0.5" />
          <circle cx="750" cy="15" r="3" fill="#C9A84C" opacity="0.6" />
          <circle cx="1050" cy="15" r="2" fill="#D4A5A5" opacity="0.5" />
        </svg>
      </div>

      {/* ─── FINAL CTA — WARM GRADIENT ─── */}
      <ScrollReveal>
        <section
          style={{
            background: "linear-gradient(165deg, #F3EAE0 0%, #F7EDED 40%, #F0E4CC 100%)",
            padding: "140px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <BotanicalOverlay color="#D4A5A5" opacity={0.08} />
          <BotanicalOverlay color="#C9A84C" opacity={0.05} />
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <p style={{ fontFamily: "var(--font-script)", fontSize: 42, color: "#C08080" }}>Begin your story</p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 76,
                fontWeight: 600,
                color: "#2A2018",
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
                      background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                      color: "#fff",
                      borderRadius: 100,
                      padding: "18px 48px",
                      fontFamily: "var(--font-body)",
                      fontSize: 16,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 200ms",
                      boxShadow: "0 4px 20px rgba(192,128,128,0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 12px 40px rgba(180,140,130,.35)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(192,128,128,0.3)";
                      e.currentTarget.style.transform = "translateY(0)";
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
                    background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                    color: "#fff",
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

      {/* ─── NEWSLETTER ─── */}
      <NewsletterSignup />

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="eydn" loading="lazy" decoding="async" style={{ height: 28 }} />
              <p style={{ fontFamily: "var(--font-script)", fontSize: 16, color: "rgba(212,165,165,0.7)", marginTop: 8 }}>
                From engagement to &ldquo;I do.&rdquo;
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", lineHeight: 1.7, marginTop: 12 }}>
                Your AI-powered wedding planning guide.
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.5)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Product</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/#features" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", textDecoration: "none" }}>Features</Link>
                <Link href="/#pricing" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", textDecoration: "none" }}>Pricing</Link>
                <Link href="/#how-it-works" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", textDecoration: "none" }}>How It Works</Link>
                <Link href="/blog" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#E8C97A", textDecoration: "none" }}>The Playbook</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.5)", textTransform: "uppercase", letterSpacing: "0.15em" }}>For Vendors</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/dashboard/vendor-portal" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", textDecoration: "none" }}>Vendor Portal</Link>
                <Link href="/#pricing" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", textDecoration: "none" }}>Placement Tiers</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.5)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Company</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="mailto:support@eydn.app" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.5)", textDecoration: "none" }}>Contact</a>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(250,246,241,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)" }}>&copy; {new Date().getFullYear()} Eydn. All rights reserved.</p>
            <div style={{ display: "flex", gap: 24 }}>
              <Link href="/privacy" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Privacy</Link>
              <Link href="/terms" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Terms</Link>
              <Link href="/cookies" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Cookie Policy</Link>
              <Link href="/disclaimer" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Disclaimer</Link>
              <Link href="/acceptable-use" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Acceptable Use</Link>
              <Link href="/accessibility" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Accessibility</Link>
              <a href="#" className="termly-display-preferences" style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)", textDecoration: "none" }}>Consent Preferences</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Newsletter ──────────────────────────────────────────── */

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setErrorMsg("Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <section
      style={{
        backgroundColor: "#2C3E2D",
        padding: "72px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "var(--font-script)",
            fontSize: 28,
            color: "#D4A5A5",
            marginBottom: 8,
          }}
        >
          Stay in the loop
        </p>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 600,
            color: "#FAF6F1",
            lineHeight: 1.2,
          }}
        >
          Planning tips, new features, and wedding inspiration
        </h3>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "rgba(250,246,241,0.6)",
            marginTop: 12,
            lineHeight: 1.6,
          }}
        >
          One email, once a week. No spam, unsubscribe anytime.
        </p>

        {status === "success" ? (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "#D4A5A5",
              marginTop: 32,
              fontWeight: 500,
            }}
          >
            You&rsquo;re in. We&rsquo;ll be in touch.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 32,
              display: "flex",
              gap: 10,
              justifyContent: "center",
            }}
            className="max-sm:!flex-col"
          >
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
              required
              style={{
                flex: 1,
                minWidth: 0,
                padding: "14px 20px",
                borderRadius: 100,
                border: "1px solid rgba(250,246,241,0.15)",
                backgroundColor: "rgba(250,246,241,0.08)",
                color: "#FAF6F1",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                color: "#fff",
                borderRadius: 100,
                padding: "14px 32px",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: status === "loading" ? "wait" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
                transition: "opacity 200ms",
                whiteSpace: "nowrap",
              }}
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && errorMsg && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "#E8A0A0",
              marginTop: 12,
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </section>
  );
}

/* ── Data ────────────────────────────────────────────────── */

const features = [
  { title: "Smart task timeline", description: "50+ tasks auto-generated from your wedding date. Grouped by phase, with deadlines, priorities, and reminders." },
  { title: "Budget tracker", description: "Track estimated costs, payments, and final costs by category. Link vendors to line items automatically." },
  { title: "Guest management", description: "RSVPs, meal preferences, roles, addresses, plus-ones, and groups. Import via CSV. Send RSVP links." },
  { title: "Vendor tracker with Google profiles", description: "Manage 13 vendor categories with status pipeline, contacts, financials, email templates, and auto-enriched Google Business profiles with ratings and reviews." },
  { title: "Wedding website", description: "A beautiful public page for your guests with schedule, travel info, registry links, photo gallery, and RSVP." },
  { title: "Complete day-of binder", description: "Timeline, ceremony script, music lists, speeches, setup assignments, attire details, vendor contacts, and packing checklist — all exportable as a beautiful branded PDF." },
  { title: "Your data, protected", description: "Daily encrypted backups, soft-delete recovery, full data export, and audit logging. Your wedding plans are never at risk." },
  { title: "AI planner that takes action", description: "Eydn sees your full wedding data and actually does things — adds guests, books vendors, searches the web for venues and pricing, generates vendor briefs, and proactively tells you what needs attention." },
  { title: "Seating chart", description: "Drag-and-drop tables for your reception. Ceremony layout for who stands where at the altar." },
  { title: "Photo gallery", description: "Guests upload their photos to a shared album right from your wedding website. No app download needed." },
];

const steps = [
  { title: "Tell us about your wedding", description: "Complete a quick 11-step guided setup. Eydn learns your date, budget, style, and what you've already booked." },
  { title: "Get your personalized plan", description: "Eydn generates 50+ tasks with real deadlines, a pre-built budget with line items, and a custom planning timeline." },
  { title: "Plan with confidence", description: "Track vendors, manage guests, build your seating chart, and let Eydn handle the rest — it searches for vendors, takes actions, and tells you what needs attention." },
];

const memoryPlanFeatures = [
  "Wedding website stays online",
  "Full data access and export",
  "Edit guest list and photos",
  "Priority support",
];

const pricingFeatures = [
  "AI planner that takes action and searches the web",
  "50+ auto-generated tasks with smart timeline",
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

const testimonials = [
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
