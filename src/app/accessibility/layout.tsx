import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Eydn is committed to WCAG 2.2 Level AA accessibility compliance. Learn about our accessibility features, supported assistive technologies, and how to report issues.",
  openGraph: {
    title: "Accessibility Statement",
    description:
      "Eydn is committed to WCAG 2.2 Level AA accessibility compliance. Learn about our accessibility features, supported assistive technologies, and how to report issues.",
  },
};

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
