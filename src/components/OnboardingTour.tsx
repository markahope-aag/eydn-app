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

type TourStep = { title: string; description: string; section?: string };

const STEPS: TourStep[] = [
  {
    title: "Welcome to Eydn!",
    description: "Your personal wedding planning assistant. Let's take a quick look at what's here so you can jump right in.",
  },
  {
    title: "Your Dashboard",
    description: "This is home base. You'll see your progress, upcoming tasks, countdown, and budget at a glance. Quick-add buttons let you create tasks, guests, or vendors without leaving the page.",
    section: "Overview",
  },
  {
    title: "Ask Eydn",
    description: "Your AI planning assistant. Ask it anything — vendor recommendations, etiquette questions, budget advice. It sees your full wedding data and can take actions for you, like adding guests or searching for venues.",
    section: "AI Chat",
  },
  {
    title: "Planning",
    description: "Tasks, budget, planning guides, and your vision board live here. Tasks are organized by timeline phase with priorities and due dates so you always know what to tackle next.",
    section: "Planning",
  },
  {
    title: "Vendors",
    description: "Track every vendor from first contact to final payment. Manage statuses, store contracts, and use email templates to reach out. Google Business profiles are pulled in automatically.",
    section: "Vendors",
  },
  {
    title: "People",
    description: "Manage your guest list with RSVPs and meal preferences, organize your wedding party with photos and roles, and build your seating chart with drag-and-drop tables.",
    section: "People",
  },
  {
    title: "Day-Of",
    description: "Your day-of planner builds a detailed timeline, ceremony script, music lists, and packing checklist. Export everything as a beautiful PDF binder for your coordinator.",
    section: "Day-Of",
  },
  {
    title: "Navigation Tip",
    description: "The sidebar groups everything into collapsible sections. Use the command palette (Cmd+K) to jump to any page instantly. And Ask Eydn is always pinned at the top of the sidebar.",
    section: "Navigation",
  },
  {
    title: "You're all set!",
    description: "Start with your tasks — they were generated from your wedding date. Or ask Eydn for help with anything. You've got this.",
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
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)" }} role="presentation" onClick={complete} />
      <div style={{ position: "relative", backgroundColor: "white", borderRadius: 20, padding: "32px 28px 24px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)" }}>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? "#2C3E2D" : "#EDE7DF", transition: "all 0.3s ease" }} />
          ))}
        </div>
        {current.section && (
          <p style={{ fontSize: 11, fontWeight: 600, color: "#8E7A9E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, textAlign: "center" }}>
            {current.section}
          </p>
        )}
        <p style={{ fontSize: 12, fontWeight: 600, color: "#2C3E2D", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, textAlign: "center" }}>
          {isFirst ? "Getting Started" : isLast ? "All Done" : `${step} of ${STEPS.length - 2}`}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", textAlign: "center", marginBottom: 8 }}>{current.title}</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#6b7280", textAlign: "center", marginBottom: 28 }}>{current.description}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {!isFirst ? (
            <button onClick={() => setStep((s) => s - 1)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#6b7280", backgroundColor: "transparent", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer" }}>Back</button>
          ) : <div />}
          <div style={{ display: "flex", gap: 8 }}>
            {!isLast && (
              <button onClick={complete} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#6b7280", backgroundColor: "transparent", border: "none", cursor: "pointer" }}>Skip</button>
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
