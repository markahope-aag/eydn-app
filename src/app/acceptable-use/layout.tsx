import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    "Acceptable use policy for the Eydn wedding planning platform.",
  openGraph: {
    title: "Acceptable Use Policy",
    description:
      "Acceptable use policy for the Eydn wedding planning platform.",
  },
};

export default function AcceptableUseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
