import type { Metadata } from "next";

const description =
  "Eight questions score your wedding's real complexity and tell you whether you can DIY, need a day-of coordinator, or need a full planner. Free, two minutes.";

export const metadata: Metadata = {
  title: "Can You Plan Your Wedding Without a Planner? Free Quiz",
  description,
  alternates: { canonical: "/tools/do-i-need-a-planner" },
  openGraph: {
    title: "Can You Plan Your Wedding Without a Planner? | Eydn",
    description,
    url: "/tools/do-i-need-a-planner",
    type: "website",
  },
};

export default function PlannerAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
