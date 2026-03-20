"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { BUDGET_CATEGORIES } from "@/lib/budget/budget-template";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  paid: boolean;
};

export default function BudgetPage() {
  const [budget, setBudget] = useState(0);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Miscellaneous");
  const [loading, setLoading] = useState(true);
  const budgetTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const amountTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/weddings").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([expData, weddingData]) => {
        setExpenses(expData);
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

  function handleAmountChange(id: string, value: number) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount: value } : e))
    );

    const existing = amountTimers.current.get(id);
    if (existing) clearTimeout(existing);

    amountTimers.current.set(
      id,
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/expenses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: value }),
          });
          if (!res.ok) throw new Error();
        } catch {
          toast.error("Failed to save amount");
        }
      }, 800)
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    const tempId = crypto.randomUUID();
    const expense: Expense = {
      id: tempId,
      description: description.trim(),
      amount: amount ? parseFloat(amount) : 0,
      category,
      paid: false,
    };

    setExpenses((prev) => [...prev, expense]);
    setDescription("");
    setAmount("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expense.description,
          amount: expense.amount,
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

  async function togglePaid(id: string) {
    const expense = expenses.find((e) => e.id === id);
    if (!expense) return;

    const prev = expenses;
    setExpenses((e) =>
      e.map((x) => (x.id === id ? { ...x, paid: !x.paid } : x))
    );

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: !expense.paid }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setExpenses(prev);
      toast.error("Failed to update");
    }
  }

  // Group expenses by category
  const grouped = new Map<string, Expense[]>();
  for (const exp of expenses) {
    if (!grouped.has(exp.category)) grouped.set(exp.category, []);
    grouped.get(exp.category)!.push(exp);
  }

  // Sort by template order, then custom categories at end
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
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-summary p-5">
          <p className="text-[13px] font-semibold text-muted">Total Budget</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg text-muted">$</span>
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
          <p className="text-[13px] font-semibold text-muted">Estimated Total</p>
          <p className="mt-1 text-[26px] font-semibold text-plum">
            ${totalSpent.toLocaleString()}
          </p>
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
            className={`progress-fill ${totalSpent > budget ? "!bg-error" : ""}`}
            style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
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
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] w-32"
          min="0"
          step="0.01"
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
          const subtotal = items.reduce((sum, e) => sum + e.amount, 0);
          const paidTotal = items.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);

          return (
            <div key={cat} className="card overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 bg-lavender">
                <h2 className="text-[15px] font-semibold text-plum">{cat}</h2>
                <div className="flex gap-4 text-[13px]">
                  <span className="text-muted">
                    Estimated: <span className="font-semibold text-plum">${subtotal.toLocaleString()}</span>
                  </span>
                  {paidTotal > 0 && (
                    <span className="text-muted">
                      Paid: <span className="font-semibold text-violet">${paidTotal.toLocaleString()}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div className="divide-y divide-border">
                {items.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={exp.paid}
                      onChange={() => togglePaid(exp.id)}
                      className="accent-violet flex-shrink-0"
                      title="Mark as paid"
                    />
                    <span className={`flex-1 text-[15px] ${exp.paid ? "text-muted line-through" : "text-plum"}`}>
                      {exp.description}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] text-muted">$</span>
                      <input
                        type="number"
                        value={exp.amount || ""}
                        onChange={(e) => handleAmountChange(exp.id, Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-24 text-right text-[15px] font-semibold text-plum bg-transparent border-0 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="text-[12px] text-error hover:opacity-80 flex-shrink-0"
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
