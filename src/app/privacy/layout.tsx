import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Eydn collects, uses, and protects your personal data. Our privacy policy covers data storage, third-party services, cookies, and your rights as a wedding planning platform user.",
  openGraph: {
    title: "Privacy Policy",
    description:
      "Learn how Eydn collects, uses, and protects your personal data. Our privacy policy covers data storage, third-party services, cookies, and your rights as a wedding planning platform user.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
