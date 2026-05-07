"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type Props = {
  /** Current wedding city (already loaded by the parent). */
  city: string | null;
  /** Wedding id for the PATCH call when the user edits. */
  weddingId: string | null;
  /** Notify the parent so it can sync the directory's location filter. */
  onCityChange: (city: string) => void;
};

/**
 * Location-aware banner for the vendor directory. Communicates that the
 * directory is location-filtered and gives a one-click path to set or
 * change the wedding city without leaving the page.
 *
 *   - When set:   "Showing vendors near {city} · Change"
 *   - When empty: "Add your wedding location to focus the search"
 *                 with an inline input + Save button.
 */
export function LocationBanner({ city, weddingId, onCityChange }: Props) {
  const hasCity = !!city && city.trim().length > 0;
  const [editing, setEditing] = useState(!hasCity);
  const [draft, setDraft] = useState(city ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the editor open when there's no city; collapse to summary once one
  // is set so the banner doesn't shout at couples who already filled it in.
  useEffect(() => {
    setEditing(!hasCity);
    setDraft(city ?? "");
  }, [city, hasCity]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    if (!weddingId) return;
    const next = draft.trim();
    if (!next) {
      toast.error("Add a city or state so we can find local vendors.");
      return;
    }
    if (next === city) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_city: next }),
      });
      if (!res.ok) throw new Error();
      onCityChange(next);
      toast.success("Location saved — directory updated");
      setEditing(false);
    } catch {
      toast.error("Couldn't save the location. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // Empty state — no city set
  if (!hasCity) {
    return (
      <div className="rounded-[12px] border border-violet/25 bg-lavender/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <PinIcon className="text-violet flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-plum">
              Add your wedding location to focus the search
            </p>
            <p className="text-[12px] text-muted mt-0.5">
              Without a location the directory shows vendors from everywhere — set a city or state and we&apos;ll narrow it to your area.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            placeholder="e.g. Austin, TX"
            aria-label="Wedding location"
            className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-[14px] flex-1 sm:w-44 focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !draft.trim()}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // Set + editing — show the input again
  if (editing) {
    return (
      <div className="rounded-[12px] border border-violet/25 bg-lavender/40 px-4 py-3 flex items-center gap-2">
        <PinIcon className="text-violet flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setDraft(city ?? "");
              setEditing(false);
            }
          }}
          placeholder="e.g. Austin, TX"
          aria-label="Wedding location"
          className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-[14px] flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary btn-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(city ?? "");
            setEditing(false);
          }}
          className="text-[12px] text-muted hover:text-plum"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Set + collapsed — summary line
  return (
    <div className="rounded-[12px] border border-border bg-whisper px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <PinIcon className="text-violet flex-shrink-0" />
        <p className="text-[13px] text-plum truncate">
          Showing vendors near <span className="font-semibold">{city}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[12px] font-semibold text-violet hover:text-soft-violet flex-shrink-0"
      >
        Change
      </button>
    </div>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 12.5s-4.5-3.8-4.5-7A4.5 4.5 0 0 1 7 1a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 7-4.5 7Z" />
      <circle cx="7" cy="5.5" r="1.5" />
    </svg>
  );
}
