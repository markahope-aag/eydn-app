"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "eydn_tour_complete";

function getIsTourDone() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// Simple external store for localStorage check
let tourListeners: Array<() => void> = [];
function subscribeTour(cb: () => void) {
  tourListeners.push(cb);
  return () => { tourListeners = tourListeners.filter((l) => l !== cb); };
}

type TourStep = { title: string; description: string };

const STEPS: TourStep[] = [
  {
    title: "Welcome to Eydn!",
    description: "Your personal wedding planning assistant. We'll walk you through the key features to help you plan your perfect day.",
  },
  {
    title: "Your Tasks",
    description: "Your planning timeline lives here. Tasks are organized by phase so you always know what to tackle next — from booking the venue to final details.",
  },
  {
    title: "Ask Eydn",
    description: "Have a question? Our AI assistant can help with vendor recommendations, etiquette advice, timeline suggestions, and more.",
  },
  {
    title: "Your Vendors",
    description: "Track every vendor in one place. Update statuses, store contact info, and manage contracts as you build your dream team.",
  },
  {
    title: "You're all set!",
    description: "You're ready to start planning. Explore the dashboard, add your wedding details, and let Eydn guide you every step of the way.",
  },
];

export function OnboardingTour() {
  const isDone = useSyncExternalStore(subscribeTour, getIsTourDone, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    tourListeners.forEach((l) => l());
  }, []);

  if (isDone || dismissed) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)" }} onClick={complete} />
      <div style={{ position: "relative", backgroundColor: "white", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)" }}>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? "#2C3E2D" : "#EDE7DF", transition: "all 0.3s ease" }} />
          ))}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#2C3E2D", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, textAlign: "center" }}>
          {isFirst ? "Getting Started" : isLast ? "All Done" : `Step ${step} of ${STEPS.length - 2}`}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", textAlign: "center", marginBottom: 8 }}>{current.title}</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#6b7280", textAlign: "center", marginBottom: 28 }}>{current.description}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {!isFirst ? (
            <button onClick={() => setStep((s) => s - 1)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#6b7280", backgroundColor: "transparent", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer" }}>Back</button>
          ) : <div />}
          <div style={{ display: "flex", gap: 8 }}>
            {!isLast && (
              <button onClick={complete} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#9ca3af", backgroundColor: "transparent", border: "none", cursor: "pointer" }}>Skip</button>
            )}
            <button
              onClick={() => { if (isLast) complete(); else setStep((s) => s + 1); }}
              style={{ padding: "8px 20px", fontSize: 14, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #2C3E2D, #C9A84C)", border: "none", borderRadius: 10, cursor: "pointer" }}
            >
              {isLast ? "Start Planning" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
