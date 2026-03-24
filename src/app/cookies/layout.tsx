import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Understand how Eydn uses cookies and similar tracking technologies on our wedding planning platform. Manage your cookie preferences and learn about the data we collect.",
  openGraph: {
    title: "Cookie Policy",
    description:
      "Understand how Eydn uses cookies and similar tracking technologies on our wedding planning platform. Manage your cookie preferences and learn about the data we collect.",
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
