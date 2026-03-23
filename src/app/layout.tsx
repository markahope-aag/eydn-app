import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import Link from "next/link";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "eydn — Your AI Wedding Planning Guide",
  description: "Plan your perfect wedding with eydn. AI-powered task timeline, budget tracker, vendor management, guest RSVPs, seating chart, and a beautiful wedding website — all in one place.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.className} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-whisper text-plum">
        <ClerkProvider>
          <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white/95 backdrop-blur px-6 py-3">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="eydn" className="h-7" />
              </Link>
              <Show when="signed-out">
                <nav className="hidden sm:flex items-center gap-6">
                  <Link href="/#features" className="text-[15px] text-muted hover:text-plum transition">Features</Link>
                  <Link href="/#how-it-works" className="text-[15px] text-muted hover:text-plum transition">How It Works</Link>
                  <Link href="/#pricing" className="text-[15px] text-muted hover:text-plum transition">Pricing</Link>
                </nav>
              </Show>
            </div>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <Link href="/sign-in" className="btn-ghost btn-sm">Sign In</Link>
                <Link href="/sign-up" className="btn-primary btn-sm">Start Free Trial</Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="text-[15px] font-semibold text-violet hover:text-soft-violet transition"
                >
                  Dashboard
                </Link>
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
