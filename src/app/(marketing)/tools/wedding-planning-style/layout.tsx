import type { Metadata } from "next";

const description =
  "Eight questions map you to one of five wedding planning archetypes — Spreadsheet Commander, Vibes-Only Planner, Delegator, Detail Obsessive, or Balanced Duo. Free, two minutes.";

export const metadata: Metadata = {
  title: "What's Your Wedding Planning Style? Free Quiz",
  description,
  alternates: { canonical: "/tools/wedding-planning-style" },
  openGraph: {
    title: "What's Your Wedding Planning Style? | Eydn",
    description,
    url: "/tools/wedding-planning-style",
    type: "website",
  },
};

export default function PlanningStyleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
