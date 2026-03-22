"use client";

import { useMemo, useSyncExternalStore } from "react";

const COLORS = [
  "#2C3E2D", "#D4A5A5", "#E8D5B7", "#EDE7DF", "#FFD700", "#C9A84C", "#C08080",
];

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
  size: number;
  drift: number;
};

function generatePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    drift: -50 + Math.random() * 100,
  }));
}

// Simple timer-based external store to auto-hide after 3.5s
let listeners: Array<() => void> = [];
let visibleUntil = 0;

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

function getVisible() {
  return Date.now() < visibleUntil;
}

export function triggerConfetti() {
  visibleUntil = Date.now() + 3500;
  listeners.forEach((l) => l());
  setTimeout(() => listeners.forEach((l) => l()), 3500);
}

export function Confetti() {
  const visible = useSyncExternalStore(subscribe, getVisible, () => false);
  const pieces = useMemo(() => (visible ? generatePieces(30) : []), [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) translateX(0px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--drift)) rotate(var(--end-rotation)); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -10,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.size > 9 ? "50%" : "2px",
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            ["--drift" as string]: `${p.drift}px`,
            ["--end-rotation" as string]: `${p.rotation + 720}deg`,
          }}
        />
      ))}
    </div>
  );
}
