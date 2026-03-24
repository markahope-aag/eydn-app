import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eydn Beta Program — Free Wedding Planning App",
  description:
    "Join the Eydn beta program. 50 free licenses for early adopters to plan their wedding with AI-powered tools.",
  openGraph: {
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
