"use client";

import Link from "next/link";
import { Show, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          background: scrolled ? "rgba(250,246,241,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid var(--champagne, #E8D5B7)" : "1px solid transparent",
          transition: "background 0.35s, border-bottom 0.35s, backdrop-filter 0.35s",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Nav links (left) */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="eydn" decoding="async" style={{ height: 30 }} />
          </Link>
          <nav
            style={{ display: "flex", alignItems: "center", gap: 24 }}
            className="max-md:!hidden"
          >
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="landing-nav-link"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: "#2A2018",
                  opacity: 0.75,
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side: auth-aware buttons */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 16 }}
          className="max-md:!hidden"
        >
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="landing-nav-cta"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 600,
                color: "#FAF6F1",
                background: "#2C3E2D",
                borderRadius: 100,
                padding: "8px 20px",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="landing-nav-link"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2A2018",
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="landing-nav-cta"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#FAF6F1",
                  background: "#2C3E2D",
                  borderRadius: 100,
                  padding: "8px 20px",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                Start Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile right side */}
        <div className="md:!hidden flex items-center gap-3">
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-in"}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              color: isSignedIn ? "#FAF6F1" : "#2A2018",
              background: isSignedIn ? "#2C3E2D" : "transparent",
              borderRadius: 100,
              padding: isSignedIn ? "6px 16px" : "0",
              textDecoration: "none",
            }}
          >
            {isSignedIn ? "Dashboard" : "Sign In"}
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:!hidden"
          onClick={() => setMobileMenuOpen(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
          aria-label="Open menu"
        >
          <span style={{ display: "block", width: 22, height: 2, background: "#2A2018", borderRadius: 2 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#2A2018", borderRadius: 2 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#2A2018", borderRadius: 2 }} />
        </button>
      </nav>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#2C3E2D",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
            }}
            aria-label="Close menu"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" stroke="#FAF6F1" strokeWidth="2" strokeLinecap="round" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {navLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                color: "#FAF6F1",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Show when="signed-out">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                color: "#FAF6F1",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 16,
                fontWeight: 600,
                color: "#2C3E2D",
                background: "#FAF6F1",
                borderRadius: 100,
                padding: "14px 36px",
                textDecoration: "none",
                marginTop: 8,
              }}
            >
              Start Free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                color: "#FAF6F1",
                textDecoration: "none",
              }}
            >
              Dashboard
            </Link>
          </Show>
        </div>
      )}
    </>
  );
}
