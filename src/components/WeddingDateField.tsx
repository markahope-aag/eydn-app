"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  weddingId: string;
  initialDate: string | null;
};

function formatDate(date: string): string {
  // Noon avoids any timezone off-by-one when rendering a date-only value.
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Inline-editable wedding date on the dashboard hero. Saving refreshes the
 * page so the countdown and the date-driven task timeline pick up the change.
 */
export function WeddingDateField({ weddingId, initialDate }: Props) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialDate ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(date);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    if (draft === date) {
      setEditing(false);
      return;
    }
    if (!draft) {
      toast.error("Pick a date first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: draft }),
      });
      if (!res.ok) throw new Error();
      setDate(draft);
      setEditing(false);
      toast.success("Wedding date updated");
      // Countdown and the generated task timeline are server-rendered.
      router.refresh();
    } catch {
      toast.error("Couldn't save the date. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(date);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
          aria-label="Wedding date"
          className="rounded-[8px] border border-border px-2 py-1 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-[13px] font-semibold text-violet hover:text-soft-violet disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="text-[13px] text-muted hover:text-plum"
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
        setDraft(date);
        setEditing(true);
      }}
      aria-label={date ? `Wedding date ${formatDate(date)}, click to edit` : "Add wedding date"}
      className="mt-2 inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-plum transition"
    >
      <CalendarIcon />
      <span className={date ? "" : "italic"}>
        {date ? formatDate(date) : "Add wedding date"}
      </span>
      <span className="text-[12px] font-medium text-violet">Edit</span>
    </button>
  );
}

function CalendarIcon() {
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
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
      <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" />
    </svg>
  );
}
