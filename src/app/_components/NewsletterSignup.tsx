"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setErrorMsg("Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <section
      style={{
        backgroundColor: "#2C3E2D",
        padding: "72px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 600,
            color: "#FAF6F1",
            lineHeight: 1.2,
          }}
        >
          Get our free wedding planning checklist
        </h3>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "rgba(250,246,241,0.7)",
            marginTop: 12,
            lineHeight: 1.6,
          }}
        >
          Plus weekly tips from couples who&rsquo;ve been there. One email a week.
          No spam, unsubscribe anytime.
        </p>

        {status === "success" ? (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "#D4A5A5",
              marginTop: 32,
              fontWeight: 500,
            }}
          >
            Check your inbox — your checklist is on its way.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 32,
              display: "flex",
              gap: 10,
              justifyContent: "center",
            }}
            className="max-sm:!flex-col"
          >
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
              required
              style={{
                flex: 1,
                minWidth: 0,
                padding: "14px 20px",
                borderRadius: 100,
                border: "1px solid rgba(250,246,241,0.15)",
                backgroundColor: "rgba(250,246,241,0.08)",
                color: "#FAF6F1",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                color: "#fff",
                borderRadius: 100,
                padding: "14px 32px",
                fontFamily: "var(--font-body)",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: status === "loading" ? "wait" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
                transition: "opacity 200ms",
                whiteSpace: "nowrap",
              }}
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && errorMsg && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "#E8A0A0",
              marginTop: 12,
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </section>
  );
}
