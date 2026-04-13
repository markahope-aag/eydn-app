import type { Metadata } from "next";

const description =
  "How Eydn makes money: we charge couples directly. No vendor commissions, no data sales, no ads. $79 Lifetime or $14.99 monthly — that's the whole business model.";

export const metadata: Metadata = {
  title: "How Eydn Makes Money",
  description,
  alternates: { canonical: "/how-we-make-money" },
  openGraph: {
    title: "How Eydn Makes Money | Eydn",
    description,
    url: "/how-we-make-money",
    type: "website",
  },
};

export default function HowWeMakeMoneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
