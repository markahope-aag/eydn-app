"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type Props = {
  weddingId: string;
  initialValue: string | null;
};

/**
 * "Things Eydn Should Know" — inline-editable free-text notes (key_decisions)
 * that feed the AI assistant's context. Edited directly on the dashboard
 * rather than linking out to Settings.
 */
export function KeyDecisionsCard({ weddingId, initialValue }: Props) {
  const [value, setValue] = useState<string>(initialValue ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function save() {
    const next = draft.trim();
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_decisions: next || null }),
      });
      if (!res.ok) throw new Error();
      setValue(next);
      setEditing(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Couldn't save your notes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="card p-5 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-semibold text-plum">Things Eydn Should Know</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="btn-ghost btn-sm"
          >
            {value ? "Edit" : "Add notes"}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="Preferences, allergies, must-haves, family dynamics, key decisions — anything Eydn should keep in mind."
            className="w-full rounded-[10px] border border-border px-3 py-2 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet/30 resize-y"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary btn-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
            <button type="button" onClick={cancel} className="btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <p className="text-[14px] text-muted leading-relaxed whitespace-pre-line">{value}</p>
      ) : (
        <p className="text-[14px] text-muted">
          Tell Eydn about your wedding preferences, allergies, must-haves, and key decisions.
        </p>
      )}

      <p className="text-[12px] text-muted mt-3">
        These notes shape every conversation with your AI planning assistant.
      </p>
    </div>
  );
}
