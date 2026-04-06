import type { Metadata } from "next";

const description =
  "Eydn is committed to WCAG 2.2 Level AA compliance. Learn about our accessibility features and supported assistive technologies.";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description,
  alternates: { canonical: "/accessibility" },
  openGraph: {
    title: "Accessibility Statement | Eydn",
    description,
    url: "/accessibility",
    type: "website",
  },
};

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
