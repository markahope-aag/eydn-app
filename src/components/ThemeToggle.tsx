"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "theme";

function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return "dark";
  if (saved === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let themeListeners: Array<() => void> = [];

function subscribeTheme(cb: () => void) {
  themeListeners.push(cb);
  return () => { themeListeners = themeListeners.filter((l) => l !== cb); };
}

function getSnapshot() {
  return getTheme();
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    themeListeners.forEach((l) => l());
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[14px] font-semibold transition hover:opacity-80"
      style={{ background: "var(--surface)", color: "var(--deep-plum)" }}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span className="text-[18px]" aria-hidden="true">
        {theme === "light" ? "\u263C" : "\u263E"}
      </span>
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}
