"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { BUDGET_CATEGORIES } from "@/lib/budget/budget-template";

type Expense = {
  id: string;
  description: string;
  estimated: number;
  amount_paid: number;
  final_cost: number | null;
  category: string;
  paid: boolean;
  vendor_id: string | null;
  vendor_name: string | null;
};

type Vendor = {
  id: string;
  name: string;
  category: string;
  amount: number | null;
  amount_paid: number | null;
};

export default function BudgetPage() {
  const [budget, setBudget] = useState(0);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Miscellaneous");
  const [loading, setLoading] = useState(true);
  const budgetTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const fieldTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/weddings").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([expData, weddingData, vendorData]) => {
        setExpenses(expData);
        setVendors(vendorData);
        if (weddingData) {
          setBudget(weddingData.budget ?? 0);
          setWeddingId(weddingData.id);
        }
      })
      .catch(() => toast.error("Failed to load budget data"))
      .finally(() => setLoading(false));
  }, []);

  function handleBudgetChange(value: number) {
    setBudget(value);
    if (budgetTimer.current) clearTimeout(budgetTimer.current);
    budgetTimer.current = setTimeout(async () => {
      if (!weddingId) return;
      try {
        const res = await fetch(`/api/weddings/${weddingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget: value }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Failed to save budget");
      }
    }, 800);
  }

  function handleFieldChange(id: string, field: string, value: number | null) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

    const timerKey = `${id}-${field}`;
    const existing = fieldTimers.current.get(timerKey);
    if (existing) clearTimeout(existing);

    fieldTimers.current.set(
      timerKey,
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/expenses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          });
          if (!res.ok) throw new Error();
        } catch {
          toast.error("Failed to save");
        }
      }, 800)
    );
  }

  const totalEstimated = expenses.reduce((sum, e) => sum + (e.estimated || 0), 0);
  const totalPaid = expenses.reduce((sum, e) => sum + (e.amount_paid || 0), 0);
  const totalFinal = expenses.reduce((sum, e) => sum + (e.final_cost ?? e.estimated ?? 0), 0);
  const remaining = budget - totalFinal;

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    const tempId = crypto.randomUUID();
    const expense: Expense = {
      id: tempId,
      description: description.trim(),
      estimated: 0,
      amount_paid: 0,
      final_cost: null,
      category,
      paid: false,
      vendor_id: null,
      vendor_name: null,
    };

    setExpenses((prev) => [...prev, expense]);
    setDescription("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expense.description,
          estimated: 0,
          category: expense.category,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setExpenses((prev) => prev.map((x) => (x.id === tempId ? saved : x)));
      toast.success("Line item added");
    } catch {
      setExpenses((prev) => prev.filter((x) => x.id !== tempId));
      toast.error("Failed to add line item");
    }
  }

  async function removeExpense(id: string) {
    const prev = expenses;
    setExpenses((e) => e.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setExpenses(prev);
      toast.error("Failed to remove");
    }
  }

  async function linkVendor(expenseId: string, vendorId: string) {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) return;

    const prev = expenses;
    setExpenses((e) =>
      e.map((x) =>
        x.id === expenseId
          ? {
              ...x,
              vendor_id: vendorId,
              vendor_name: vendor.name,
              estimated: vendor.amount ?? x.estimated,
              amount_paid: vendor.amount_paid ?? x.amount_paid,
            }
          : x
      )
    );

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vendorId,
          estimated: vendor.amount ?? undefined,
          amount_paid: vendor.amount_paid ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Linked to ${vendor.name}`);
    } catch {
      setExpenses(prev);
      toast.error("Failed to link vendor");
    }
  }

  // Group expenses by category
  const grouped = new Map<string, Expense[]>();
  for (const exp of expenses) {
    if (!grouped.has(exp.category)) grouped.set(exp.category, []);
    grouped.get(exp.category)!.push(exp);
  }

  const sortedCategories = [...grouped.keys()].sort((a, b) => {
    const ai = BUDGET_CATEGORIES.indexOf(a);
    const bi = BUDGET_CATEGORIES.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const allCategories = [...new Set([...BUDGET_CATEGORIES, ...grouped.keys()])];

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading budget...</p>;
  }

  return (
    <div>
      <h1>Budget</h1>

      {/* Budget overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-summary p-5">
          <p className="text-[13px] font-semibold text-muted">Total Budget</p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-muted">$</span>
            <input
              type="number"
              value={budget || ""}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              placeholder="0"
              className="text-[26px] font-semibold text-plum w-full outline-none bg-transparent border-0"
            />
          </div>
        </div>
        <div className="card-summary p-5">
          <p className="text-[13px] font-semibold text-muted">Estimated</p>
          <p className="mt-1 text-[26px] font-semibold text-plum">${totalEstimated.toLocaleString()}</p>
        </div>
        <div className="card-summary p-5">
          <p className="text-[13px] font-semibold text-muted">Paid</p>
          <p className="mt-1 text-[26px] font-semibold text-violet">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="card-summary p-5">
          <p className="text-[13px] font-semibold text-muted">Remaining</p>
          <p className={`mt-1 text-[26px] font-semibold ${remaining < 0 ? "text-error" : "text-violet"}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {budget > 0 && (
        <div className="progress-track mt-4">
          <div
            className={`progress-fill ${totalPaid > budget ? "!bg-error" : ""}`}
            style={{ width: `${Math.min((totalPaid / budget) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Add custom line item */}
      <form onSubmit={addExpense} className="mt-8 flex gap-3">
        <input
          type="text"
          placeholder="Add a line item..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px]"
        >
          {allCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary">Add</button>
      </form>

      {/* Grouped expense list */}
      <div className="mt-6 space-y-6">
        {sortedCategories.map((cat) => {
          const items = grouped.get(cat)!;
          const catEstimated = items.reduce((sum, e) => sum + (e.estimated || 0), 0);
          const catPaid = items.reduce((sum, e) => sum + (e.amount_paid || 0), 0);

          return (
            <div key={cat} className="card overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 bg-lavender">
                <h2 className="text-[15px] font-semibold text-plum">{cat}</h2>
                <div className="flex gap-4 text-[13px]">
                  <span className="text-muted">
                    Est: <span className="font-semibold text-plum">${catEstimated.toLocaleString()}</span>
                  </span>
                  <span className="text-muted">
                    Paid: <span className="font-semibold text-violet">${catPaid.toLocaleString()}</span>
                  </span>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_100px_100px_100px_60px] gap-2 px-4 py-2 border-b border-border text-[12px] font-semibold text-muted">
                <span>Item</span>
                <span className="text-right">Estimated</span>
                <span className="text-right">Paid</span>
                <span className="text-right">Final Cost</span>
                <span></span>
              </div>

              {/* Line items */}
              <div className="divide-y divide-border">
                {items.map((exp) => (
                  <div key={exp.id} className="grid grid-cols-[1fr_100px_100px_100px_60px] gap-2 px-4 py-2 items-center">
                    <div>
                      <span className="text-[15px] text-plum">{exp.description}</span>
                      {exp.vendor_name && (
                        <span className="ml-2 badge badge-booked">{exp.vendor_name}</span>
                      )}
                      {!exp.vendor_id && vendors.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) linkVendor(exp.id, e.target.value);
                          }}
                          className="ml-2 text-[12px] text-muted border-0 bg-transparent cursor-pointer"
                        >
                          <option value="">Link vendor...</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-[12px] text-muted">$</span>
                      <input
                        type="number"
                        value={exp.estimated || ""}
                        onChange={(e) => handleFieldChange(exp.id, "estimated", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-20 text-right text-[15px] font-semibold text-plum bg-transparent border-0 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-[12px] text-muted">$</span>
                      <input
                        type="number"
                        value={exp.amount_paid || ""}
                        onChange={(e) => handleFieldChange(exp.id, "amount_paid", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-20 text-right text-[15px] font-semibold text-violet bg-transparent border-0 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-[12px] text-muted">$</span>
                      <input
                        type="number"
                        value={exp.final_cost ?? ""}
                        onChange={(e) => handleFieldChange(exp.id, "final_cost", e.target.value ? Number(e.target.value) : null)}
                        placeholder="—"
                        min="0"
                        step="0.01"
                        className="w-20 text-right text-[15px] font-semibold text-plum bg-transparent border-0 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="text-[12px] text-error hover:opacity-80 text-right"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {expenses.length === 0 && (
          <p className="text-[15px] text-muted text-center py-8">
            No budget items yet. Complete onboarding to get started with a pre-built budget template.
          </p>
        )}
      </div>
    </div>
  );
}
