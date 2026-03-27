import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GlobalHeader } from "@/components/GlobalHeader";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE_URL = "https://eydn.app";
const SITE_NAME = "Eydn";
const DEFAULT_DESCRIPTION = "Plan your wedding with Eydn. AI-powered timeline, budget tracker, vendor management, guest RSVPs, seating chart, and wedding website — all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eydn — Your AI Wedding Planning Guide",
    template: "%s | Eydn",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ["wedding planning", "wedding planner app", "AI wedding planner", "guest list app", "wedding budget tracker", "wedding timeline", "RSVP", "seating chart", "wedding website builder"],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Eydn — Your AI Wedding Planning Guide",
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eydn — AI-powered wedding planning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eydn — Your AI Wedding Planning Guide",
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "p:domain_verify": "e7c997f6eed9a7af061aae0214b63544",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.className} h-full antialiased`} suppressHydrationWarning>
      <head />
      <body className="min-h-full flex flex-col bg-whisper text-plum overflow-x-hidden" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-plum"
        >
          Skip to main content
        </a>
        <ClerkProvider>
          <GlobalHeader />
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
        <Analytics />
        <Script
          id="ahrefs-analytics"
          strategy="afterInteractive"
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="N0UcdeuFPyyC4uaXyXmywA"
        />
        {/* Termly consent banner disabled for beta launch — re-enable for EU/GDPR expansion */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-55H9SNZB');`,
          }}
        />
      </body>
    </html>
  );
}
