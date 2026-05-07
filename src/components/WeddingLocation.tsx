"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type Props = {
  weddingId: string;
  initialCity: string | null;
};

/**
 * Inline-editable wedding location. Shown on the dashboard hero so couples
 * can see the city their planning is anchored to and update it in place.
 * The same `venue_city` value also powers the auto-filter on the vendor
 * directory.
 */
export function WeddingLocation({ weddingId, initialCity }: Props) {
  const [city, setCity] = useState<string>(initialCity ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(city);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const next = draft.trim();
    if (next === city) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_city: next || null }),
      });
      if (!res.ok) throw new Error();
      setCity(next);
      toast.success(next ? "Location updated" : "Location cleared");
      setEditing(false);
    } catch {
      toast.error("Couldn't save the location. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(city);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <PinIcon />
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
            if (e.key === "Escape") cancel();
          }}
          placeholder="e.g. Austin, TX"
          aria-label="Wedding location"
          className="rounded-[8px] border border-border px-2 py-1 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-[12px] font-semibold text-violet hover:text-soft-violet disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="text-[12px] text-muted hover:text-plum"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(city);
        setEditing(true);
      }}
      aria-label={city ? `Wedding location ${city}, click to edit` : "Add wedding location"}
      className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-plum transition group"
    >
      <PinIcon />
      <span className={city ? "" : "italic"}>
        {city || "Add location"}
      </span>
      <span className="text-[11px] text-violet opacity-0 group-hover:opacity-100 transition">
        Edit
      </span>
    </button>
  );
}

function PinIcon() {
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
    >
      <path d="M7 12.5s-4.5-3.8-4.5-7A4.5 4.5 0 0 1 7 1a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 7-4.5 7Z" />
      <circle cx="7" cy="5.5" r="1.5" />
    </svg>
  );
}
