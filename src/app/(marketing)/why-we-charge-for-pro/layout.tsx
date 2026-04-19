import type { Metadata } from "next";

const description =
  "Why Eydn charges for Pro: AI costs real money to run, and charging you is what lets us stay independent of vendor money. Lifetime $79 or Monthly $14.99.";

export const metadata: Metadata = {
  title: "Why We Charge for Pro",
  description,
  alternates: { canonical: "/why-we-charge-for-pro" },
  openGraph: {
    title: "Why We Charge for Pro | Eydn",
    description,
    url: "/why-we-charge-for-pro",
    type: "website",
  },
};

export default function WhyWeChargeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
