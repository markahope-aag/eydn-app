"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/vendors/categories";
import { Modal } from "@/components/Modal";
import { Field } from "@/components/Field";
import type { QuickStartStep } from "@/lib/onboarding/quick-start";

type Props = {
  step: QuickStartStep;
  weddingId: string;
  onClose: () => void;
  /** Called after a successful save so the dashboard can refresh + re-tick. */
  onSaved: () => void;
};

/**
 * Focused overlay for a single Quick Start step. The couple completes the
 * essential action in place and returns to the walk-through — no full-page
 * navigation. Each step also offers a link to its full page for deeper work.
 */
export function QuickStartStepModal({ step, weddingId, onClose, onSaved }: Props) {
  return (
    <Modal open onClose={onClose} title={step.label} description={step.description}>
      <div className="mt-1">
        <StepBody step={step} weddingId={weddingId} onSaved={onSaved} />
      </div>
      <div className="mt-5 border-t border-border/60 pt-3">
        <Link href={step.href} className="text-[13px] font-semibold text-violet hover:text-soft-violet transition">
          Open the full page →
        </Link>
      </div>
    </Modal>
  );
}

function StepBody({ step, weddingId, onSaved }: { step: QuickStartStep; weddingId: string; onSaved: () => void }) {
  switch (step.key) {
    case "date":
      return <DateBody weddingId={weddingId} onSaved={onSaved} />;
    case "budget":
      return <BudgetBody weddingId={weddingId} onSaved={onSaved} />;
    case "guests":
      return <GuestsBody onSaved={onSaved} />;
    case "vendors":
      return <VendorsBody onSaved={onSaved} />;
    case "tasks":
      return <TasksBody onSaved={onSaved} />;
    default:
      return null;
  }
}

async function patchWedding(weddingId: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`/api/weddings/${weddingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

function DateBody({ weddingId, onSaved }: { weddingId: string; onSaved: () => void }) {
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!date) return;
    setBusy(true);
    try {
      if (!(await patchWedding(weddingId, { date }))) throw new Error();
      toast.success("Wedding date saved");
      onSaved();
    } catch {
      toast.error("Couldn't save the date. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Wedding date" labelHidden>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          autoFocus
        />
      </Field>
      <button onClick={save} disabled={!date || busy} className="btn-primary disabled:opacity-50">
        {busy ? "Saving…" : "Save date"}
      </button>
    </div>
  );
}

function BudgetBody({ weddingId, onSaved }: { weddingId: string; onSaved: () => void }) {
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const value = Number(budget);
    if (!Number.isFinite(value) || value <= 0) return;
    setBusy(true);
    try {
      if (!(await patchWedding(weddingId, { budget: value }))) throw new Error();
      toast.success("Budget saved");
      onSaved();
    } catch {
      toast.error("Couldn't save the budget. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Total budget (USD)" labelHidden>
        {(p) => (
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted">$</span>
            <input
              {...p}
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 30000"
              className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px]"
              autoFocus
            />
          </div>
        )}
      </Field>
      <button onClick={save} disabled={!budget || busy} className="btn-primary disabled:opacity-50">
        {busy ? "Saving…" : "Save budget"}
      </button>
    </div>
  );
}

function GuestsBody({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [added, setAdded] = useState(0);
  const [busy, setBusy] = useState(false);

  async function add() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) throw new Error();
      setAdded((a) => a + 1);
      setName("");
      toast.success(`Added ${n}`);
    } catch {
      toast.error("Couldn't add that guest. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Guest name" labelHidden>
        {(p) => (
          <div className="flex gap-2">
            <input
              {...p}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              placeholder="Guest name"
              className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px]"
              autoFocus
            />
            <button onClick={add} disabled={!name.trim() || busy} className="btn-secondary disabled:opacity-50">
              Add
            </button>
          </div>
        )}
      </Field>
      {added > 0 && (
        <p className="text-[13px] text-confirmed-text">
          {added} guest{added === 1 ? "" : "s"} added.
        </p>
      )}
      <button onClick={() => (added > 0 ? onSaved() : undefined)} disabled={added === 0} className="btn-primary disabled:opacity-50">
        Done
      </button>
    </div>
  );
}

function VendorsBody({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [added, setAdded] = useState(0);
  const [busy, setBusy] = useState(false);

  async function add() {
    const n = name.trim();
    if (!n || !category) return;
    setBusy(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, category }),
      });
      if (!res.ok) throw new Error();
      setAdded((a) => a + 1);
      setName("");
      toast.success(`Added ${n}`);
    } catch {
      toast.error("Couldn't add that vendor. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Vendor name" labelHidden>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunset Gardens Venue"
          className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          autoFocus
        />
      </Field>
      <Field label="Vendor category" labelHidden>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-[10px] border-border bg-white px-3 py-2 text-[15px]"
        >
          <option value="" disabled>Choose a category…</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{categoryLabel(c)}</option>
          ))}
        </select>
      </Field>
      <button onClick={add} disabled={!name.trim() || !category || busy} className="btn-secondary disabled:opacity-50">
        Add vendor
      </button>
      {added > 0 && (
        <p className="text-[13px] text-confirmed-text">
          {added} vendor{added === 1 ? "" : "s"} added.
        </p>
      )}
      <button onClick={() => (added > 0 ? onSaved() : undefined)} disabled={added === 0} className="btn-primary disabled:opacity-50">
        Done
      </button>
    </div>
  );
}

type OpenTask = { id: string; title: string };

function TasksBody({ onSaved }: { onSaved: () => void }) {
  const [tasks, setTasks] = useState<OpenTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedAny, setCompletedAny] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; title: string; status: string; parent_task_id: string | null }>) => {
        if (!active) return;
        setTasks(
          data
            .filter((t) => t.status !== "done" && !t.parent_task_id)
            .slice(0, 5)
            .map((t) => ({ id: t.id, title: t.title }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function markDone(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done", completed: true }),
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setCompletedAny(true);
      toast.success("Nice — one done");
    } catch {
      toast.error("Couldn't update that task. Try again.");
    }
  }

  if (loading) return <p className="text-[14px] text-muted">Loading your tasks…</p>;
  if (tasks.length === 0 && !completedAny) {
    return <p className="text-[14px] text-muted">No open tasks right now.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <button
          key={t.id}
          onClick={() => markDone(t.id)}
          className="w-full flex items-center gap-3 rounded-[10px] border border-border px-3 py-2 text-left hover:border-violet/40 hover:bg-lavender/30 transition"
        >
          <span aria-hidden="true" className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border text-transparent">
            ✓
          </span>
          <span className="flex-1 text-[15px] text-plum">{t.title}</span>
          <span className="text-[12px] font-semibold text-violet">Mark done</span>
        </button>
      ))}
      {completedAny && (
        <button onClick={onSaved} className="btn-primary mt-1">
          Done
        </button>
      )}
    </div>
  );
}
