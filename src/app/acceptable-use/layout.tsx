import type { Metadata } from "next";

const description =
  "Rules and guidelines for using the Eydn wedding planning platform, including prohibited activities and content standards.";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description,
  alternates: { canonical: "/acceptable-use" },
  openGraph: {
    title: "Acceptable Use Policy | Eydn",
    description,
    url: "/acceptable-use",
    type: "website",
  },
};

export default function AcceptableUseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
