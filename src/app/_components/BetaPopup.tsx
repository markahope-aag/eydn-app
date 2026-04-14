"use client";

import { useEffect, useRef, useState } from "react";

type BetaStatus = {
  beta_available: boolean;
  slots_remaining: number;
  total_slots: number;
  slots_taken: number;
};

const DISMISS_KEY = "eydn.betaPopup.dismissed";
const APPEAR_AFTER_MS = 6000;

export function BetaPopup() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<BetaStatus | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    fetch("/api/public/beta")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});

    const t = setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // Focus management, focus trap, and Escape-to-close while visible.
  useEffect(() => {
    if (!visible) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => headingRef.current?.focus());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus?.();
    };
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That didn't go through. Try again.");
        return;
      }
      setSubmitted(true);
      setSuccessMessage(data.message || "You're in. Check your email.");
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // ignore
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  const slotsRemaining = status?.slots_remaining ?? null;
  const isFull = status ? !status.beta_available : false;

  return (
    <>
      <div
        onClick={dismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26, 26, 46, 0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 9998,
          animation: "betaPopupFade 220ms ease-out",
        }}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-popup-heading"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          background: "#FAF6F1",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(26, 26, 46, 0.35)",
          zIndex: 9999,
          animation: "betaPopupIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* header band */}
        <div
          style={{
            background: "linear-gradient(135deg, #2C3E2D, #D4A5A5)",
            padding: "20px 28px",
            borderRadius: "20px 20px 0 0",
            position: "relative",
          }}
        >
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(250,246,241,0.2)",
              border: "none",
              borderRadius: 999,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#FAF6F1",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 999,
              background: "rgba(250,246,241,0.18)",
              color: "#FAF6F1",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Beta program
          </div>
          <h2
            ref={headingRef}
            id="beta-popup-heading"
            tabIndex={-1}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 600,
              color: "#FAF6F1",
              marginTop: 12,
              lineHeight: 1.2,
              outline: "none",
            }}
          >
            Get Eydn free — for life.
          </h2>
        </div>

        <div style={{ padding: "24px 28px 28px" }}>
          {submitted ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "#2C3E2D",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {successMessage}
              </p>
              <button
                onClick={dismiss}
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: "12px 20px",
                  background: "#2C3E2D",
                  color: "#FAF6F1",
                  border: "none",
                  borderRadius: 999,
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Got it
              </button>
            </>
          ) : isFull ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "#2C3E2D",
                  lineHeight: 1.6,
                  marginTop: 0,
                }}
              >
                All 50 beta seats are taken. Join the waitlist and we&rsquo;ll
                open the next cohort to you first, plus a 20% discount code
                when you&rsquo;re ready to upgrade.
              </p>
              <BetaForm
                name={name}
                email={email}
                setName={setName}
                setEmail={setEmail}
                submitting={submitting}
                submitLabel={submitting ? "Adding you..." : "Join the waitlist"}
                onSubmit={handleSubmit}
                error={error}
              />
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "#2C3E2D",
                  lineHeight: 1.6,
                  marginTop: 0,
                }}
              >
                We&rsquo;re letting 50 couples in first &mdash; free forever, no
                trial, no card. In return we&rsquo;d love your honest feedback
                on what works and what doesn&rsquo;t.
              </p>
              {slotsRemaining !== null && (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#C08080",
                    marginTop: 12,
                    marginBottom: 0,
                  }}
                >
                  {slotsRemaining} of 50 seats left.
                </p>
              )}
              <BetaForm
                name={name}
                email={email}
                setName={setName}
                setEmail={setEmail}
                submitting={submitting}
                submitLabel={submitting ? "Claiming..." : "Claim my seat"}
                onSubmit={handleSubmit}
                error={error}
              />
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "rgba(44,62,45,0.55)",
                  marginTop: 12,
                  marginBottom: 0,
                  textAlign: "center",
                }}
              >
                No spam. Unsubscribe any time.
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes betaPopupFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes betaPopupIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

interface BetaFormProps {
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
}

function BetaForm({
  name,
  email,
  setName,
  setEmail,
  submitting,
  submitLabel,
  onSubmit,
  error,
}: BetaFormProps) {
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(44,62,45,0.15)",
    background: "#fff",
    fontFamily: "var(--font-body)",
    fontSize: 14,
    color: "#2C3E2D",
    outline: "none",
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }} aria-describedby={error ? "beta-form-error" : undefined}>
      <label htmlFor="beta-name" className="sr-only">Your name</label>
      <input
        id="beta-name"
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        aria-invalid={Boolean(error)}
        style={fieldStyle}
      />
      <label htmlFor="beta-email" className="sr-only">Your email</label>
      <input
        id="beta-email"
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        aria-invalid={Boolean(error)}
        style={{ ...fieldStyle, marginTop: 10 }}
      />
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "14px 20px",
          background: "linear-gradient(135deg, #D4A5A5, #C08080)",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          fontWeight: 600,
          cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1,
          boxShadow: "0 4px 16px rgba(192,128,128,0.3)",
        }}
      >
        {submitLabel}
      </button>
      {error && (
        <p
          id="beta-form-error"
          role="alert"
          aria-live="polite"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "#C08080",
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
