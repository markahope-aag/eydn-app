import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Eydn's commitment to WCAG 2.2 Level AA accessibility compliance.",
  openGraph: {
    title: "Accessibility Statement",
    description:
      "Eydn's commitment to WCAG 2.2 Level AA accessibility compliance.",
  },
};

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
