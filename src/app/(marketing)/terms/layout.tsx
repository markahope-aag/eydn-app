import type { Metadata } from "next";

const description =
  "Terms and conditions for using Eydn. Covers account usage, payments, intellectual property, and user responsibilities.";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms and Conditions | Eydn",
    description,
    url: "/terms",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
