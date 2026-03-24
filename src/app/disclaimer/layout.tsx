import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important disclaimers about the Eydn wedding planning platform and AI assistant.",
  openGraph: {
    title: "Disclaimer",
    description:
      "Important disclaimers about the Eydn wedding planning platform and AI assistant.",
  },
};

export default function DisclaimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
