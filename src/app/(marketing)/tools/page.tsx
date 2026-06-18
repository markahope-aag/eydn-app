import Link from "next/link";

// The budget calculator is the highest-intent tool — feature it full-width and
// dominant. The quizzes follow in a grid, in the requested order:
// Wedding Style → Planning Style → DIY vs Planner.
const featured = {
  href: "/tools/wedding-budget-calculator",
  badge: "Most Popular",
  eyebrow: "Calculator",
  title: "Wedding Budget Calculator",
  blurb:
    "Get a realistic budget broken down by category, based on your guest count, state, and season. Save your result with a link you can come back to.",
  cta: "Get my free budget breakdown",
};

const quizzes = [
  {
    href: "/tools/wedding-style",
    eyebrow: "Quiz · 2 min",
    title: "What's your wedding style?",
    blurb:
      "Eight questions reveal your wedding aesthetic — Classic, Modern, Rustic, Boho, Romantic, or Glam — with a starting color palette and the details that bring it to life.",
    cta: "Discover my wedding aesthetic",
  },
  {
    href: "/tools/wedding-planning-style",
    eyebrow: "Quiz · 2 min",
    title: "What's your wedding planning style?",
    blurb:
      "Eight questions map you to one of five planning archetypes — Spreadsheet Commander, Vibes-Only Planner, Delegator, Detail Obsessive, or Balanced Duo. Share your result with your partner.",
    cta: "Find my planning archetype",
  },
  {
    href: "/tools/do-i-need-a-planner",
    eyebrow: "Quiz · 2 min",
    title: "Can you plan your wedding without a planner?",
    blurb:
      "Scores your wedding's real complexity — guest count, events, destination, vendor count, runway — and tells you whether you can DIY, need a coordinator, or need a full planner.",
    cta: "See if I need a planner",
  },
];

export default function ToolsHubPage() {
  return (
    <div id="main-content" className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-[12px] font-semibold text-violet uppercase tracking-wide mb-3">
          Free tools
        </p>
        <h1 className="font-serif text-[48px] leading-tight text-plum">
          Wedding planning tools, free to use.
        </h1>
        <p className="mt-4 text-[17px] text-muted leading-relaxed">
          Free and no account needed — the planning tools couples actually use to
          plan smarter.
        </p>
      </div>

      <div className="mt-14 space-y-6">
        {/* Featured — full-width, dominant: the highest-intent tool */}
        <Link
          href={featured.href}
          className="group relative block card-summary rounded-[20px] border-2 border-violet/40 hover:border-violet transition p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-7">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet text-white text-[11px] font-semibold uppercase tracking-wide px-3 py-1">
                <span aria-hidden="true">★</span> {featured.badge}
              </span>
              <div className="mt-4 text-[12px] font-semibold text-violet uppercase tracking-wide">
                {featured.eyebrow}
              </div>
              <h2 className="font-serif text-[30px] md:text-[40px] text-plum leading-tight mt-1">
                {featured.title}
              </h2>
              <p className="mt-3 text-[15px] md:text-[16px] text-muted leading-relaxed max-w-2xl">
                {featured.blurb}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center justify-center rounded-[12px] bg-brand-gradient text-white font-semibold px-7 py-3.5 text-[15px] group-hover:opacity-90 transition">
                {featured.cta} →
              </span>
            </div>
          </div>
        </Link>

        {/* Quizzes */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group card-summary p-7 flex flex-col hover:border-violet transition border border-border"
            >
              <div className="text-[11px] font-semibold text-violet uppercase tracking-wide">
                {tool.eyebrow}
              </div>
              <h2 className="font-serif text-[24px] text-plum leading-snug mt-2">
                {tool.title}
              </h2>
              <p className="mt-3 text-[14px] text-muted leading-relaxed flex-1">
                {tool.blurb}
              </p>
              <div className="mt-5 text-[14px] font-semibold text-violet group-hover:text-soft-violet transition">
                {tool.cta} →
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-[14px] text-muted">
          Everything above is free. When you&apos;re ready for the full Eydn experience —
          AI planner, task timeline, budget tracker, day-of binder —{" "}
          <Link href="/sign-up" className="text-violet hover:text-soft-violet underline">
            start your 14-day trial
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
