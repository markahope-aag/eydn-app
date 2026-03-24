import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    "Our acceptable use policy outlines the rules and guidelines for using the Eydn wedding planning platform, including prohibited activities and content standards.",
  openGraph: {
    title: "Acceptable Use Policy",
    description:
      "Our acceptable use policy outlines the rules and guidelines for using the Eydn wedding planning platform, including prohibited activities and content standards.",
  },
};

export default function AcceptableUseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
