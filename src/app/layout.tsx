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
  title: "eydn",
  description: "Your AI wedding planning guide",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-whisper text-plum">
        <ClerkProvider>
          <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
            <Link href="/" className="text-lg font-semibold bg-brand-gradient bg-clip-text text-transparent">
              eydn
            </Link>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton>
                  <button className="btn-ghost btn-sm">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="btn-primary btn-sm">
                    Get Started
                  </button>
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
