import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eydn Beta Program — Free Wedding Planning App",
  description:
    "Join the Eydn beta program. 50 free licenses for early adopters to plan their wedding with AI-powered tools.",
  alternates: { canonical: "/beta" },
  openGraph: {
    url: "/beta",
    title: "Eydn Beta Program — Free Wedding Planning App",
    description:
      "Join the Eydn beta program. 50 free licenses for early adopters to plan their wedding with AI-powered tools.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eydn Beta Program — Free Wedding Planning App",
    description:
      "Join the Eydn beta program. 50 free licenses for early adopters to plan their wedding with AI-powered tools.",
  },
};

export default function BetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
