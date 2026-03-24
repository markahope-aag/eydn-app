import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Read the terms and conditions for using Eydn, the AI-powered wedding planning platform. Covers account usage, payments, intellectual property, and user responsibilities.",
  openGraph: {
    title: "Terms and Conditions",
    description:
      "Read the terms and conditions for using Eydn, the AI-powered wedding planning platform. Covers account usage, payments, intellectual property, and user responsibilities.",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
