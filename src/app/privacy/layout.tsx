import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Eydn's privacy policy. How we collect, use, and protect your wedding planning data.",
  openGraph: {
    title: "Privacy Policy",
    description:
      "Eydn's privacy policy. How we collect, use, and protect your wedding planning data.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
