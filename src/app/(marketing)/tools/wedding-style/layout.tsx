import type { Metadata } from "next";

const description =
  "Eight questions reveal your wedding aesthetic — Classic, Modern, Rustic, Boho, Romantic, or Glam — with a starting palette and the details that bring it to life. Free, two minutes.";

export const metadata: Metadata = {
  title: "What's Your Wedding Style? Free Aesthetic Quiz",
  description,
  alternates: { canonical: "/tools/wedding-style" },
  openGraph: {
    title: "What's Your Wedding Style? | Eydn",
    description,
    url: "/tools/wedding-style",
    type: "website",
  },
};

export default function WeddingStyleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
