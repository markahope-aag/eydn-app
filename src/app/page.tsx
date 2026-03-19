import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Meet Eydn, Your AI Wedding Guide
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
            From your first &ldquo;yes&rdquo; to your last dance, Eydn helps you plan every detail
            — guests, vendors, budget, timeline, and more — with a personal touch.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-full bg-rose-600 px-8 py-3 text-sm font-semibold text-white shadow hover:bg-rose-500 transition"
              >
                Go to Dashboard
              </Link>
            </Show>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Everything You Need to Plan Your Perfect Day
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border p-6">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{f.description}</p>
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
    title: "AI Wedding Assistant",
    description:
      "Chat with Eydn for personalized advice, vendor tips, and planning guidance anytime.",
  },
  {
    icon: "\u{2705}",
    title: "Smart Task Timeline",
    description:
      "50+ auto-generated tasks with deadlines based on your wedding date. Never miss a milestone.",
  },
  {
    icon: "\u{1F4B0}",
    title: "Budget Tracker",
    description:
      "Set your budget, track spending by vendor and category, and stay in control.",
  },
  {
    icon: "\u{1F4CB}",
    title: "Guest Management",
    description:
      "Track RSVPs, meal preferences, plus-ones, and groups. Import via CSV.",
  },
  {
    icon: "\u{1F91D}",
    title: "Vendor Tracker",
    description:
      "Manage all 13 vendor categories with status pipeline, contacts, and email templates.",
  },
  {
    icon: "\u{1F4BA}",
    title: "Seating Chart",
    description:
      "Drag-and-drop guests onto tables. See capacity at a glance.",
  },
  {
    icon: "\u{1F46B}",
    title: "Wedding Party",
    description:
      "Track roles, contact info, and day-of job assignments for your crew.",
  },
  {
    icon: "\u{1F4C5}",
    title: "Day-of Planner",
    description:
      "Auto-generated timeline, vendor contacts, party jobs, and packing checklist.",
  },
  {
    icon: "\u{1F514}",
    title: "Smart Notifications",
    description:
      "Get reminded about upcoming deadlines so nothing slips through the cracks.",
  },
];
