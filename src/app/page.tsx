import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center bg-brand-gradient">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-[34px] font-semibold tracking-tight text-white leading-[1.2]" style={{ letterSpacing: "-0.5px" }}>
            Meet eydn, your wedding planning guide
          </h1>
          <p className="mt-6 text-[15px] text-white/80 max-w-xl mx-auto leading-relaxed">
            From your first &ldquo;yes&rdquo; to your last dance, eydn helps you plan every detail
            — guests, vendors, budget, timeline, and more — with a personal touch.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-full bg-white px-8 py-3 text-[15px] font-semibold text-violet shadow hover:bg-lavender transition"
              >
                Go to Dashboard
              </Link>
            </Show>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-whisper">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-[26px] font-semibold text-center text-plum" style={{ letterSpacing: "-0.5px" }}>
            Everything you need to plan your day
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="card p-4">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl"
                  style={{ background: i % 2 === 0 ? "#F7C8E0" : "#F0E0FF" }}
                >
                  {f.icon}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-plum">
                  {f.title}
                </h3>
                <p className="mt-1 text-[13px] text-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

const features = [
  {
    icon: "\u{1F4AC}",
    title: "AI wedding assistant",
    description:
      "Chat with eydn for personalized advice, vendor tips, and planning guidance anytime.",
  },
  {
    icon: "\u{2705}",
    title: "Smart task timeline",
    description:
      "50+ auto-generated tasks with deadlines based on your wedding date. Never miss a milestone.",
  },
  {
    icon: "\u{1F4B0}",
    title: "Budget tracker",
    description:
      "Set your budget, track spending by vendor and category, and stay in control.",
  },
  {
    icon: "\u{1F4CB}",
    title: "Guest management",
    description:
      "Track RSVPs, meal preferences, plus-ones, and groups. Import via CSV.",
  },
  {
    icon: "\u{1F91D}",
    title: "Vendor tracker",
    description:
      "Manage all 13 vendor categories with status pipeline, contacts, and email templates.",
  },
  {
    icon: "\u{1F4BA}",
    title: "Seating chart",
    description:
      "Drag and drop guests onto tables. See capacity at a glance.",
  },
  {
    icon: "\u{1F46B}",
    title: "Wedding party",
    description:
      "Track roles, contact info, and day-of job assignments for your crew.",
  },
  {
    icon: "\u{1F4C5}",
    title: "Day-of planner",
    description:
      "Auto-generated timeline, vendor contacts, party jobs, and packing checklist.",
  },
  {
    icon: "\u{1F514}",
    title: "Smart notifications",
    description:
      "Get reminded about upcoming deadlines so nothing slips through the cracks.",
  },
];
