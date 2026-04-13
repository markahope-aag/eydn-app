import type { Metadata } from "next";

const description =
  "What \"free\" wedding apps really cost you. A breakdown of how vendor directories extract roughly $20 per user per year — and how you pay it without seeing it.";

export const metadata: Metadata = {
  title: "What \"Free\" Really Costs You",
  description,
  alternates: { canonical: "/what-free-costs" },
  openGraph: {
    title: "What \"Free\" Really Costs You | Eydn",
    description,
    url: "/what-free-costs",
    type: "website",
  },
};

export default function WhatFreeCostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
