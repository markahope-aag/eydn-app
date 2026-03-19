import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Plan Your Perfect Day
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
            Manage your guest list, track RSVPs, organize tasks, and keep your
            wedding budget on track — all in one place.
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
            Everything You Need
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
    icon: "\u{1F4CB}",
    title: "Guest Management",
    description:
      "Add guests, track RSVPs, manage meal preferences, and assign seating.",
  },
  {
    icon: "\u{2705}",
    title: "Task Checklist",
    description:
      "Stay organized with a categorized to-do list and due date reminders.",
  },
  {
    icon: "\u{1F4B0}",
    title: "Budget Tracker",
    description:
      "Set your budget and track spending across vendors and categories.",
  },
  {
    icon: "\u{1F4C5}",
    title: "Timeline",
    description:
      "See your countdown and key milestones on an interactive timeline.",
  },
  {
    icon: "\u{1F4A1}",
    title: "Vendor Directory",
    description: "Keep all your vendor contacts, contracts, and notes in one spot.",
  },
  {
    icon: "\u{1F4E7}",
    title: "RSVP Invitations",
    description: "Send digital invitations and collect RSVPs automatically.",
  },
];
