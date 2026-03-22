import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

/* ── SVG Icon Components ─────────────────────────────────── */

function IconAI() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
      <path d="M15 3l2-1M9 3L7 2M12 1v1" />
    </svg>
  );
}

function IconTimeline() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function IconBudget() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconGuests() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconVendors() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconWebsite() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconSeating() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}

function IconBinder() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Ornament() {
  return (
    <div className="flex items-center justify-center gap-3 my-2">
      <div className="w-16 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border))" }} />
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="var(--violet)" opacity="0.4" />
      </svg>
      <div className="w-16 h-px" style={{ background: "linear-gradient(90deg, var(--border), transparent)" }} />
    </div>
  );
}

const featureIcons = [IconAI, IconTimeline, IconBudget, IconGuests, IconVendors, IconWebsite, IconSeating, IconBinder, IconCamera, IconShield];

const deepDiveIcons = [
  <IconAI key="ai" />,
  <IconWebsite key="web" />,
  <IconBudget key="budget" />,
  <IconBinder key="binder" />,
  <IconShield key="shield" />,
];

/* ── Page ─────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <main className={`flex-1 flex flex-col ${playfair.variable}`}>

      {/* ─── Hero ─── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="" className="w-full h-full object-cover scale-105" aria-hidden="true" style={{ filter: "brightness(0.85)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(26,16,48,0.92) 0%, rgba(26,16,48,0.7) 40%, rgba(26,16,48,0.5) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-12 py-32">
          <p className="text-[13px] tracking-[0.3em] uppercase text-white/50 font-light">Your AI Wedding Planning Guide</p>
          <h1 className="mt-4 font-[family-name:var(--font-serif)] text-[52px] sm:text-[72px] lg:text-[88px] font-medium text-white leading-[1.05]" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5), 0 4px 40px rgba(0,0,0,0.3)" }}>
            Plan your wedding,<br />
            <span className="italic" style={{ color: "var(--petal)" }}>not your stress</span>
          </h1>
          <p className="mt-8 text-[17px] sm:text-[19px] text-white/70 max-w-xl leading-relaxed font-light">
            From guest lists to vendor outreach to your day-of binder — everything in one place, with a personal touch.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Show when="signed-out">
              <SignUpButton>
                <button className="group relative px-8 py-4 text-[15px] font-semibold text-[#1A1030] overflow-hidden rounded-full transition-all hover:shadow-xl hover:shadow-violet/20" style={{ background: "linear-gradient(135deg, #fff 0%, var(--petal) 100%)" }}>
                  Start Your Free Trial
                </button>
              </SignUpButton>
              <Link
                href="/#features"
                className="px-8 py-4 text-[15px] font-medium text-white/90 border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all"
              >
                Explore Features
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="px-8 py-4 text-[15px] font-semibold text-[#1A1030] rounded-full transition-all hover:shadow-xl" style={{ background: "linear-gradient(135deg, #fff 0%, var(--petal) 100%)" }}>
                Go to Dashboard
              </Link>
            </Show>
          </div>
          <p className="mt-5 text-[12px] text-white/40 tracking-wide">14-day free trial &middot; No credit card required</p>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="py-5 border-b border-border/50" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-center gap-6 sm:gap-10 text-[12px] tracking-[0.05em] uppercase text-muted/80 flex-wrap">
          {["50+ Auto-Generated Tasks", "13 Vendor Categories", "AI That Remembers You", "Complete Day-of Binder", "Bank-Grade Protection"].map((item, i) => (
            <span key={i} className="flex items-center gap-6 sm:gap-10">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-border -ml-3 sm:-ml-5" />}
              <span>{item}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-28" style={{ background: "var(--whisper)" }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="max-w-2xl">
            <p className="text-[12px] tracking-[0.3em] uppercase text-violet font-medium">Features</p>
            <h2 className="mt-3 font-[family-name:var(--font-serif)] text-[40px] sm:text-[52px] text-plum leading-[1.1]">
              Everything you need,<br />nothing you don&apos;t
            </h2>
            <p className="mt-5 text-[16px] text-muted leading-relaxed">
              Stop juggling five different apps. eydn brings your entire wedding plan into one place — smart, personal, and genuinely delightful to use.
            </p>
          </div>

          <div className="mt-16 grid gap-px sm:grid-cols-2 lg:grid-cols-3 rounded-[20px] overflow-hidden border border-border/60" style={{ background: "var(--border)" }}>
            {features.map((f, i) => {
              const Icon = featureIcons[i] || IconShield;
              return (
                <div key={f.title} className="p-8 sm:p-10 group transition-colors" style={{ background: "var(--surface)" }}>
                  <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-violet group-hover:bg-violet group-hover:text-white group-hover:border-violet transition-all duration-300">
                    <Icon />
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold text-plum">{f.title}</h3>
                  <p className="mt-2 text-[14px] text-muted leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-28" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-12">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-[12px] tracking-[0.3em] uppercase text-violet font-medium">How It Works</p>
            <h2 className="mt-3 font-[family-name:var(--font-serif)] text-[40px] sm:text-[52px] text-plum leading-[1.1]">
              From &ldquo;yes&rdquo; to &ldquo;I do&rdquo;
            </h2>
          </div>

          <div className="mt-20 grid sm:grid-cols-3 gap-0">
            {steps.map((s, i) => (
              <div key={s.title} className="relative text-center px-8 py-6">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-8 right-0 w-px h-16 bg-border" />
                )}
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-[22px] font-[family-name:var(--font-serif)] font-light" style={{ background: "var(--lavender-mist)", color: "var(--violet)" }}>
                  {i + 1}
                </div>
                <h3 className="mt-6 text-[18px] font-semibold text-plum">{s.title}</h3>
                <p className="mt-3 text-[14px] text-muted leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Deep Dives ─── */}
      <section className="py-28" style={{ background: "var(--whisper)" }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-12 space-y-32">
          {deepDives.map((d, i) => (
            <div key={d.title} className={`flex flex-col gap-16 items-center ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
              <div className="flex-1 max-w-xl">
                <p className="text-[12px] tracking-[0.3em] uppercase text-violet font-medium">{d.label}</p>
                <h3 className="mt-3 font-[family-name:var(--font-serif)] text-[34px] sm:text-[42px] text-plum leading-[1.15]">{d.title}</h3>
                <p className="mt-5 text-[15px] text-muted leading-relaxed">{d.description}</p>
                <ul className="mt-6 space-y-3">
                  {d.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-violet/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-violet">
                        <IconCheck />
                      </span>
                      <span className="text-[14px] text-plum leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 flex justify-center w-full">
                <div className="w-full max-w-sm rounded-[24px] p-10 text-center border border-border/60 relative overflow-hidden" style={{ background: "var(--surface)" }}>
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, var(--violet), var(--blush-pink))" }} />
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5 text-violet" style={{ background: "var(--lavender-mist)" }}>
                    {deepDiveIcons[i]}
                  </div>
                  <p className="text-[15px] text-muted italic leading-relaxed">{d.cardText}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Trust & Security ─── */}
      <section className="py-24" style={{ background: "var(--surface)" }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-12">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-[12px] tracking-[0.3em] uppercase text-violet font-medium">Trust &amp; Security</p>
            <h2 className="mt-3 font-[family-name:var(--font-serif)] text-[36px] sm:text-[48px] text-plum leading-[1.1]">
              We protect what matters most
            </h2>
            <p className="mt-5 text-[15px] text-muted leading-relaxed">
              Your wedding plans are irreplaceable. We&apos;ve built eydn with multiple layers of data protection.
            </p>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Daily Backups", desc: "Automated encrypted backups every night to redundant off-site servers", icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              )},
              { title: "30-Day Recovery", desc: "Accidentally delete something? Restore any guest, task, or vendor instantly", icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              )},
              { title: "Data Export", desc: "Download everything in one click. Your data belongs to you, always", icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              )},
              { title: "Audit Trail", desc: "Every change is logged. See who changed what, when, with full history", icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              )},
            ].map((item) => (
              <div key={item.title} className="text-center group">
                <div className="w-14 h-14 rounded-full border border-border mx-auto flex items-center justify-center text-violet group-hover:bg-violet group-hover:text-white group-hover:border-violet transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-plum">{item.title}</h3>
                <p className="mt-2 text-[13px] text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-28" style={{ background: "var(--whisper)" }}>
        <div className="max-w-4xl mx-auto px-6 sm:px-12 text-center">
          <p className="text-[12px] tracking-[0.3em] uppercase text-violet font-medium">Pricing</p>
          <h2 className="mt-3 font-[family-name:var(--font-serif)] text-[40px] sm:text-[52px] text-plum leading-[1.1]">
            One price. Your whole wedding.
          </h2>
          <p className="mt-5 text-[15px] text-muted max-w-lg mx-auto leading-relaxed">
            No subscriptions, no hidden fees. Pay once and plan your entire wedding with full access to every feature.
          </p>

          <div className="mt-16 max-w-md mx-auto rounded-[24px] border border-border/60 overflow-hidden" style={{ background: "var(--surface)" }}>
            <div className="h-1.5" style={{ background: "linear-gradient(90deg, var(--violet), var(--blush-pink))" }} />
            <div className="p-10 sm:p-12">
              <p className="text-[12px] tracking-[0.2em] uppercase text-muted font-medium">Full Access</p>
              <div className="mt-3" style={{ background: "linear-gradient(135deg, var(--violet), var(--blush-pink))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                <span className="text-[64px] font-[family-name:var(--font-serif)] font-normal leading-none">$79</span>
              </div>
              <p className="mt-2 text-[14px] text-muted">One-time payment &middot; 1 wedding &middot; Forever</p>

              <Ornament />

              <div className="mt-6 text-left grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {pricingFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-violet/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-violet">
                      <IconCheck />
                    </span>
                    <span className="text-[13px] text-plum leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              <Show when="signed-out">
                <SignUpButton>
                  <button className="w-full mt-10 py-4 text-[15px] font-semibold text-white rounded-full transition-all hover:shadow-lg hover:shadow-violet/25" style={{ background: "linear-gradient(135deg, var(--violet), var(--blush-pink))" }}>
                    Start 14-Day Free Trial
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="block w-full mt-10 py-4 text-[15px] font-semibold text-white rounded-full text-center transition-all hover:shadow-lg hover:shadow-violet/25" style={{ background: "linear-gradient(135deg, var(--violet), var(--blush-pink))" }}>
                  Go to Dashboard
                </Link>
              </Show>
              <p className="mt-4 text-[12px] text-muted/60">No credit card required for the trial.</p>
            </div>
          </div>

          {/* Memory Plan */}
          <div className="mt-8 max-w-md mx-auto rounded-[20px] border border-border/40 p-8 text-left" style={{ background: "var(--surface)" }}>
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-semibold text-plum">Memory Plan</p>
              <div>
                <span className="text-[28px] font-[family-name:var(--font-serif)] text-plum">$29</span>
                <span className="text-[13px] text-muted">/year</span>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-muted leading-relaxed">
              Keep your wedding website live and your data accessible after the wedding.
            </p>
            <div className="mt-4 space-y-2">
              {memoryPlanFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-violet/10 flex items-center justify-center flex-shrink-0 text-violet">
                    <IconCheck />
                  </span>
                  <span className="text-[13px] text-plum">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-28 overflow-hidden" style={{ background: "#1A1030" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, var(--violet) 0%, transparent 50%), radial-gradient(circle at 80% 50%, var(--blush-pink) 0%, transparent 50%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-[family-name:var(--font-serif)] text-[40px] sm:text-[56px] text-white leading-[1.1]">
            Your dream wedding<br /><span className="italic" style={{ color: "var(--petal)" }}>starts here</span>
          </h2>
          <p className="mt-6 text-[17px] text-white/60 font-light">
            Join the couples who are planning smarter with eydn.
          </p>
          <Show when="signed-out">
            <SignUpButton>
              <button className="mt-10 px-10 py-4 text-[15px] font-semibold text-[#1A1030] rounded-full transition-all hover:shadow-xl hover:shadow-petal/30" style={{ background: "linear-gradient(135deg, #fff 0%, var(--petal) 100%)" }}>
                Get Started Free
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="mt-10 inline-block px-10 py-4 text-[15px] font-semibold text-[#1A1030] rounded-full transition-all hover:shadow-xl" style={{ background: "linear-gradient(135deg, #fff 0%, var(--petal) 100%)" }}>
              Go to Dashboard
            </Link>
          </Show>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-16" style={{ backgroundColor: "#1A1030" }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-12">
          <div className="grid gap-10 sm:grid-cols-4">
            <div>
              <p className="font-[family-name:var(--font-serif)] text-[20px] text-white">eydn</p>
              <p className="mt-3 text-[13px] text-white/40 leading-relaxed">
                Your AI-powered wedding planning guide. From engagement to &ldquo;I do.&rdquo;
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.15em]">Product</p>
              <div className="mt-4 space-y-2.5 text-[13px]">
                <Link href="/#features" className="block text-white/40 hover:text-white transition">Features</Link>
                <Link href="/#pricing" className="block text-white/40 hover:text-white transition">Pricing</Link>
                <Link href="/#how-it-works" className="block text-white/40 hover:text-white transition">How It Works</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.15em]">For Vendors</p>
              <div className="mt-4 space-y-2.5 text-[13px]">
                <Link href="/dashboard/vendor-portal" className="block text-white/40 hover:text-white transition">Vendor Portal</Link>
                <Link href="/#pricing" className="block text-white/40 hover:text-white transition">Placement Tiers</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60 uppercase tracking-[0.15em]">Company</p>
              <div className="mt-4 space-y-2.5 text-[13px]">
                <a href="mailto:support@eydn.app" className="block text-white/40 hover:text-white transition">Contact</a>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/30">
            <p>&copy; {new Date().getFullYear()} eydn. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white/60 transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60 transition">Terms</Link>
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
  { title: "Seating chart", description: "Drag-and-drop tables for your reception. Ceremony layout for who stands where at the altar." },
  { title: "Complete day-of binder", description: "Timeline, ceremony script, music lists, speeches, setup assignments, attire details, vendor contacts, and packing checklist — all exportable as a beautiful branded PDF." },
  { title: "Photo gallery", description: "Guests upload their photos to a shared album right from your wedding website. No app download needed." },
  { title: "Your data, protected", description: "Daily encrypted backups, soft-delete recovery, full data export, and audit logging. Your wedding plans are never at risk." },
];

const steps = [
  { title: "Tell us about your wedding", description: "Complete a quick 11-step guided setup. eydn learns your date, budget, style, and what you've already booked." },
  { title: "Get your personalized plan", description: "eydn generates 50+ tasks with real deadlines, a pre-built budget with line items, and a custom planning timeline." },
  { title: "Plan with confidence", description: "Track vendors, manage guests, build your seating chart, and chat with eydn whenever you need advice." },
];

const deepDives = [
  { label: "AI Assistant", title: "Like having a planner in your pocket", description: "eydn knows your wedding inside and out — your budget, guest count, vendor statuses, task progress, and every key decision you've made. It remembers your preferences across every conversation.", bullets: ["Remembers your style, allergies, priorities, and decisions", "Personalized answers based on your complete wedding data", "Vendor outreach tips and etiquette advice", "Budget allocation suggestions", "50-message conversation memory for natural dialogue", "Deadline reminders and next-step guidance"], cardText: "\"What should I prioritize this month?\"" },
  { label: "Wedding Website", title: "One link for all your guests", description: "Share your custom wedding website with your schedule, travel details, registry, and RSVP — all in one place. Guests can even upload photos.", bullets: ["Custom URL (eydn.app/w/your-names)", "Schedule, travel info, accommodations, FAQ", "Guest photo uploads to a shared gallery", "Unique RSVP links for each guest"], cardText: "eydn.app/w/mark-and-sarah" },
  { label: "Budget", title: "Know exactly where your money goes", description: "Start with a pre-built budget template with 36 line items across 13 categories. Track estimated costs, actual payments, and link vendors directly to budget items.", bullets: ["Pre-populated with standard wedding line items", "Estimated, paid, and final cost columns", "Link vendors to auto-sync costs", "Category subtotals and progress tracking"], cardText: "36 pre-built line items across 13 categories" },
  { label: "Day-of Binder", title: "Your complete wedding binder, digitized", description: "Everything your coordinator, DJ, photographer, and wedding party needs — in one document. Per-person schedules, ceremony script, music cues, vendor arrival times, decor layouts, and more.", bullets: ["Separate schedules for bride, groom, bridesmaids, and groomsmen", "Full ceremony script with processional order", "Music list for every moment (ceremony, reception, dances)", "Speech order with speaker roles and topics", "Setup task assignments (who does what, day before)", "Attire documentation with photos", "Vendor contact sheet with arrival times and meal needs", "Packing checklist so nothing gets left behind"], cardText: "Everything in one PDF — your complete wedding binder" },
  { label: "Data Security", title: "Your plans deserve protection", description: "Your wedding is one of the most important events of your life. We treat your data with the same care you put into planning it. Daily backups, recovery tools, and full data ownership — built into every account.", bullets: ["Daily encrypted backups to redundant off-site servers", "Soft-delete recovery — restore anything within 30 days", "Download all your data anytime with one click", "Full audit trail of every change made to your wedding", "Point-in-time database recovery (7-day window)", "Enterprise-grade security headers and rate limiting"], cardText: "Daily backups. 30-day recovery. Your data, always." },
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
