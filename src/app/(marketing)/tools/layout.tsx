import type { Metadata } from "next";

const description =
  "Free wedding planning tools from Eydn — budget calculator, planning style quiz, and planner assessment. No account required.";

export const metadata: Metadata = {
  title: "Free Wedding Planning Tools",
  description,
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free Wedding Planning Tools | Eydn",
    description,
    url: "/tools",
    type: "website",
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
