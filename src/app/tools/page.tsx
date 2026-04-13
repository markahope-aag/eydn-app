import Link from "next/link";

const tools = [
  {
    href: "/tools/wedding-budget-calculator",
    eyebrow: "Calculator",
    title: "Wedding Budget Calculator",
    blurb:
      "Get a realistic budget broken down by category, based on your guest count, state, and season. Save your result with a link you can come back to.",
    cta: "Start calculating",
  },
  {
    href: "/tools/wedding-planning-style",
    eyebrow: "Quiz · 2 min",
    title: "What's your wedding planning style?",
    blurb:
      "Eight questions map you to one of five planning archetypes — Spreadsheet Commander, Vibes-Only Planner, Delegator, Detail Obsessive, or Balanced Duo. Share your result with your partner.",
    cta: "Take the quiz",
  },
  {
    href: "/tools/do-i-need-a-planner",
    eyebrow: "Quiz · 2 min",
    title: "Can you plan your wedding without a planner?",
    blurb:
      "Scores your wedding's real complexity — guest count, events, destination, vendor count, runway — and tells you whether you can DIY, need a coordinator, or need a full planner.",
    cta: "Take the quiz",
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
          No account required. Each tool gives you a real, useful answer in under
          two minutes. Share the ones that help.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
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
