import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { Nunito } from "next/font/google";
import { Toaster } from "sonner";
import Link from "next/link";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "eydn — Your AI Wedding Planning Guide",
  description: "Plan your perfect wedding with eydn. AI-powered task timeline, budget tracker, vendor management, guest RSVPs, seating chart, and a beautiful wedding website — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.className} h-full antialiased`} suppressHydrationWarning>
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
              <Link href="/" className="text-xl font-semibold bg-brand-gradient bg-clip-text text-transparent">
                eydn
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
                <SignInButton>
                  <button className="btn-ghost btn-sm">Sign In</button>
                </SignInButton>
                <SignUpButton>
                  <button className="btn-primary btn-sm">Start Free Trial</button>
                </SignUpButton>
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
