"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Command {
  label: string;
  href: string;
  category: "Navigation" | "Actions";
}

const commands: Command[] = [
  // Navigation
  { label: "Overview", href: "/dashboard", category: "Navigation" },
  { label: "Tasks", href: "/dashboard/tasks", category: "Navigation" },
  { label: "Vendors", href: "/dashboard/vendors", category: "Navigation" },
  { label: "Budget", href: "/dashboard/budget", category: "Navigation" },
  { label: "Guests", href: "/dashboard/guests", category: "Navigation" },
  { label: "Wedding Party", href: "/dashboard/wedding-party", category: "Navigation" },
  { label: "Seating Chart", href: "/dashboard/seating", category: "Navigation" },
  { label: "Vision Board", href: "/dashboard/mood-board", category: "Navigation" },
  { label: "Day-of Planner", href: "/dashboard/day-of", category: "Navigation" },
  { label: "Ask Eydn", href: "/dashboard/chat", category: "Navigation" },
  { label: "Wedding Website", href: "/dashboard/website", category: "Navigation" },
  { label: "Settings", href: "/dashboard/settings", category: "Navigation" },

  // Actions
  { label: "Add Guest", href: "/dashboard/guests", category: "Actions" },
  { label: "Add Vendor", href: "/dashboard/vendors", category: "Actions" },
  { label: "Add Task", href: "/dashboard/tasks", category: "Actions" },
  { label: "Chat with Eydn", href: "/dashboard/chat", category: "Actions" },
  { label: "Export Guest List", href: "/dashboard/guests", category: "Actions" },
  { label: "View Wedding Website", href: "/dashboard/website", category: "Actions" },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group filtered commands by category
  const grouped: { category: string; items: Command[] }[] = [];
  const categories = ["Navigation", "Actions"] as const;
  for (const cat of categories) {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length > 0) grouped.push({ category: cat, items });
  }
  const flatItems = grouped.flatMap((g) => g.items);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const execute = useCallback(
    (cmd: Command) => {
      close();
      router.push(cmd.href);
    },
    [close, router]
  );

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-command-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        execute(flatItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!isOpen) return null;

  let itemIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[520px] mx-4 rounded-[16px] bg-white shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 py-3.5 text-[15px] text-plum placeholder:text-muted bg-transparent outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-[6px] bg-lavender px-2 py-0.5 text-[12px] text-muted font-medium">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-muted">
              No results found.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <p className="px-4 pt-3 pb-1 text-[12px] font-semibold text-muted uppercase tracking-wide">
                  {group.category}
                </p>
                {group.items.map((cmd) => {
                  itemIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  const idx = itemIndex; // capture for onClick
                  return (
                    <button
                      key={`${cmd.category}-${cmd.label}`}
                      data-command-item
                      type="button"
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors flex items-center gap-3 ${
                        isSelected
                          ? "bg-lavender text-plum font-medium"
                          : "text-plum hover:bg-lavender/50"
                      }`}
                    >
                      {cmd.category === "Navigation" ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-muted"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-muted"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )}
                      {cmd.label}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-whisper/50">
          <span className="text-[12px] text-muted">
            <kbd className="inline-flex items-center rounded-[4px] bg-lavender px-1.5 py-0.5 text-[11px] font-medium mr-1">
              &uarr;&darr;
            </kbd>
            navigate
            <kbd className="inline-flex items-center rounded-[4px] bg-lavender px-1.5 py-0.5 text-[11px] font-medium mx-1">
              &crarr;
            </kbd>
            select
          </span>
          <span className="text-[12px] text-muted font-medium">
            &#x2318;K
          </span>
        </div>
      </div>
    </div>
  );
}
