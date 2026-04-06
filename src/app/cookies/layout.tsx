import type { Metadata } from "next";

const description =
  "How Eydn uses cookies and tracking technologies. Manage your cookie preferences and learn about the data we collect.";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description,
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: "Cookie Policy | Eydn",
    description,
    url: "/cookies",
    type: "website",
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
