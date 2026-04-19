import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, Great_Vibes } from "next/font/google";

import { ScrollReveal } from "@/app/_components/ScrollReveal";
import { LandingNav } from "@/app/_components/LandingNav";
import { NewsletterSignup } from "@/app/_components/NewsletterSignup";
import { BetaPopup } from "@/app/_components/BetaPopup";
import { AuthCTA } from "@/app/_components/AuthCTA";
import {
  BotanicalOverlay,
  HeroTaskCard,
  HeroBudgetCard,
  HeroAIChatCard,
  SpotlightChat,
  featureVisuals,
} from "@/app/_components/landing/visuals";
import {
  features,
  steps,
  memoryPlanFeatures,
  pricingFeatures,
  testimonials,
  featureScriptLabels,
  featureBullets,
  darkRowIndices,
} from "@/app/_components/landing/data";

/* ── Fonts (DM Sans + Cormorant --font-serif provided by root layout) ── */

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-display",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-script",
});

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
.testimonial-card:hover {
  transform: translateY(-7px);
  box-shadow: 0 16px 48px rgba(180,140,130,.25);
}
`;

/* ── Page ─────────────────────────────────────────────────── */

export default function HomePage() {
  const fontVars = `${cormorant.variable} ${greatVibes.variable}`;

  return (
    <main
      id="main-content"
      className={`flex-1 flex flex-col ${fontVars}`}
      style={{ animation: "fadeIn 0.6s ease-out", overflowX: "hidden" }}
    >
      <style dangerouslySetInnerHTML={{ __html: keyframeCSS }} />
      <LandingNav />
      <BetaPopup />

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
            <ScrollReveal immediate>
              <p style={{ fontFamily: "var(--font-script)", fontSize: 32, color: "#D4A5A5" }}>
                Your wedding, beautifully planned
              </p>
            </ScrollReveal>
            <ScrollReveal immediate>
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
            <ScrollReveal immediate>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "#6B5E50", lineHeight: 1.65, marginTop: 28, maxWidth: 480 }}>
                From guest lists to vendor outreach to your day-of binder — everything in one beautiful place, guided by an AI that knows your wedding inside and out.
              </p>
            </ScrollReveal>
            <ScrollReveal immediate>
              <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                <AuthCTA
                  variant="hero"
                  signedOutSecondary={
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
                  }
                />
              </div>
            </ScrollReveal>
            <ScrollReveal immediate>
              <p style={{ marginTop: 24, fontFamily: "var(--font-body)", fontSize: 13, color: "#6B5E50", letterSpacing: "0.02em" }}>
                <span style={{ color: "#8B6D14" }}>&#10022;</span> 50+ Tasks &middot;{" "}
                <span style={{ color: "#8B6D14" }}>&#10022;</span> AI That Knows You &middot;{" "}
                <span style={{ color: "#8B6D14" }}>&#10022;</span> $79 One-Time
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 8px 32px rgba(180,140,130,.2)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Task Timeline</p>
          {[{ label: "Book photographer", done: true }, { label: "Finalize guest list", done: false }, { label: "Cake tasting", done: false }].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.done ? "#8A7A6A" : "#C9A84C", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: t.done ? "#6B5E50" : "#2A2018", textDecoration: t.done ? "line-through" : "none" }}>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 8px 32px rgba(180,140,130,.2)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Budget</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>$9,600 of $26,500 paid</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 8px 32px rgba(180,140,130,.2)" }}>
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
                <Image
                  key={n}
                  src={`https://i.pravatar.cc/72?img=${n + 10}`}
                  alt="Eydn user"
                  width={36}
                  height={36}
                  style={{
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
      <section id="features" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Features</h2>
        {features.slice(0, 7).map((f, i) => {
          const isDark = darkRowIndices.has(i);
          const textPanelBg = isDark ? "#2C3E2D" : "#F7EDED";
          const visualPanelBg = isDark ? "#233124" : "#F0E4CC";
          const textColor = isDark ? "#FAF6F1" : "#2A2018";
          const mutedColor = isDark ? "rgba(250,246,241,0.7)" : "#6B5E50";
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
                  aria-hidden="true"
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
                    className="testimonial-card"
                    style={{
                      background: "#F7EDED",
                      borderRadius: 16,
                      padding: "36px 28px",
                      textAlign: "left",
                      transition: "transform 300ms, box-shadow 300ms",
                      cursor: "default",
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
                <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "rgba(250,246,241,0.65)", marginTop: 8 }}>One-time payment &middot; 1 wedding &middot; Forever</p>

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
                  <AuthCTA variant="pricing" />
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

            {/* Trust strip — surfaces the Pledge and the four trust pages */}
            <div
              style={{
                marginTop: 56,
                padding: "32px 36px",
                background: "#fff",
                border: "1px solid rgba(44,32,24,0.08)",
                borderRadius: 16,
                textAlign: "left",
              }}
            >
              <p style={{ fontFamily: "var(--font-script)", fontSize: 22, color: "#C08080", margin: 0 }}>
                The Eydn Pledge
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#2A2018",
                  marginTop: 6,
                  lineHeight: 1.35,
                }}
              >
                We charge you directly so we never have to charge your vendors.
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#6B5E50", marginTop: 10, lineHeight: 1.7 }}>
                No vendor kickbacks. No data sales. No ads. No AI influenced by who&rsquo;s paying.
                If we ever break any of it, you get a refund.
              </p>
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              >
                <Link href="/pledge" style={{ color: "#2C3E2D", textDecoration: "underline" }}>
                  Read the pledge
                </Link>
                <Link href="/how-we-make-money" style={{ color: "#2C3E2D", textDecoration: "underline" }}>
                  How we make money
                </Link>
                <Link href="/why-we-charge-for-pro" style={{ color: "#2C3E2D", textDecoration: "underline" }}>
                  Why we charge for Pro
                </Link>
                <Link href="/what-free-costs" style={{ color: "#2C3E2D", textDecoration: "underline" }}>
                  What &ldquo;free&rdquo; really costs you
                </Link>
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
          <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 76,
                fontWeight: 600,
                color: "#2A2018",
                lineHeight: 1.08,
              }}
              className="max-lg:!text-[48px]"
            >
              Your wedding deserves better than a spreadsheet.
            </h2>
            <div style={{ marginTop: 44 }}>
              <AuthCTA variant="final" signedOutLabel="Get started free →" />
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
              <Image src="/logo-white.png" alt="eydn" width={112} height={28} />
              <p style={{ fontFamily: "var(--font-script)", fontSize: 16, color: "rgba(212,165,165,0.7)", marginTop: 8 }}>
                From engagement to &ldquo;I do.&rdquo;
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", lineHeight: 1.7, marginTop: 12 }}>
                Your AI-powered wedding planning guide.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <a href="https://www.instagram.com/heyeydn/" target="_blank" rel="noopener noreferrer" aria-label="Eydn on Instagram" style={{ color: "rgba(250,246,241,0.5)", transition: "color 0.2s" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a href="https://pin.it/4f47esCnG" target="_blank" rel="noopener noreferrer" aria-label="Eydn on Pinterest" style={{ color: "rgba(250,246,241,0.5)", transition: "color 0.2s" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.65)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Product</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/#features" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>Features</Link>
                <Link href="/#pricing" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>Pricing</Link>
                <Link href="/#how-it-works" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>How It Works</Link>
                <Link href="/blog" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#E8C97A", textDecoration: "none" }}>The Playbook</Link>
                <Link href="/tools" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>Free Tools</Link>
                <Link href="/beta" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>Beta Program</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.65)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Trust</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/pledge" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>The Eydn Pledge</Link>
                <Link href="/how-we-make-money" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>How we make money</Link>
                <Link href="/why-we-charge-for-pro" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>Why we charge for Pro</Link>
                <Link href="/what-free-costs" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>What &ldquo;free&rdquo; really costs</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.65)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Company</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="mailto:support@eydn.app" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.65)", textDecoration: "none" }}>Contact</a>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(250,246,241,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(250,246,241,0.55)" }}>&copy; {new Date().getFullYear()} Eydn. All rights reserved.</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
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
