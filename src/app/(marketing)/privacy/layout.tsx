import type { Metadata } from "next";

const description =
  "How Eydn collects, uses, and protects your personal data. Covers data storage, third-party services, cookies, and your rights.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Eydn",
    description,
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
