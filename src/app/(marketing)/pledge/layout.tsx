import type { Metadata } from "next";

const description =
  "The Eydn Pledge: no vendor money, no data sale, no AI influence by businesses, $79 because we mean it, refund if we ever break the promises.";

export const metadata: Metadata = {
  title: "The Eydn Pledge",
  description,
  alternates: { canonical: "/pledge" },
  openGraph: {
    title: "The Eydn Pledge | Eydn",
    description,
    url: "/pledge",
    type: "website",
  },
};

export default function PledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
