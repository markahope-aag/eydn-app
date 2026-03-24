import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Eydn uses cookies and similar technologies on our wedding planning platform.",
  openGraph: {
    title: "Cookie Policy",
    description:
      "How Eydn uses cookies and similar technologies on our wedding planning platform.",
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
