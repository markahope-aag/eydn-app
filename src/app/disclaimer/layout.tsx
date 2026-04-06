import type { Metadata } from "next";

const description =
  "Disclaimers about the Eydn platform, AI recommendations, third-party vendor information, and limitations of our service.";

export const metadata: Metadata = {
  title: "Disclaimer",
  description,
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: "Disclaimer | Eydn",
    description,
    url: "/disclaimer",
    type: "website",
  },
};

export default function DisclaimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
