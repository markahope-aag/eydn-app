import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important disclaimers about the Eydn wedding planning platform, AI assistant recommendations, third-party vendor information, and limitations of our service.",
  openGraph: {
    title: "Disclaimer",
    description:
      "Important disclaimers about the Eydn wedding planning platform, AI assistant recommendations, third-party vendor information, and limitations of our service.",
  },
};

export default function DisclaimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
