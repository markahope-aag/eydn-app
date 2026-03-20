"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  paid: boolean;
};

const categories = [
  "Venue",
  "Catering",
  "Photography",
  "Flowers",
  "Music",
  "Attire",
  "Decorations",
  "Other",
];

export default function BudgetPage() {
  const [budget, setBudget] = useState(0);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [loading, setLoading] = useState(true);
  const budgetTimer = useRef<ReturnType<typeof setTimeout>>(null);

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

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const tempId = crypto.randomUUID();
    const expense: Expense = {
      id: tempId,
      description: description.trim(),
      amount: parseFloat(amount),
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
      toast.success("Expense added");
    } catch {
      setExpenses((prev) => prev.filter((x) => x.id !== tempId));
      toast.error("Failed to add expense");
    }
  }

  async function removeExpense(id: string) {
    const prev = expenses;
    setExpenses((e) => e.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Expense removed");
    } catch {
      setExpenses(prev);
      toast.error("Failed to remove expense");
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
      toast.error("Failed to update expense");
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading budget...</p>;
  }

  return (
    <div>
      <h1>Budget</h1>

      {/* Budget overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[15px] text-muted">Total Budget</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg text-muted">$</span>
            <input
              type="number"
              value={budget || ""}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              placeholder="0"
              className="text-2xl font-semibold text-plum w-full outline-none"
            />
          </div>
        </div>
        <div className="card p-5">
          <p className="text-[15px] text-muted">Spent</p>
          <p className="mt-1 text-2xl font-semibold text-plum">
            ${totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[15px] text-muted">Remaining</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              remaining < 0 ? "text-error" : "text-violet"
            }`}
          >
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {budget > 0 && (
        <div className="progress-track mt-4 h-3">
          <div
            className={`h-full rounded-full transition-all ${
              totalSpent > budget ? "bg-error" : "progress-fill"
            }`}
            style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Add expense */}
      <form onSubmit={addExpense} className="mt-8 flex gap-3">
        <input
          type="text"
          placeholder="Description"
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
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn-primary"
        >
          Add
        </button>
      </form>

      {/* Expense list */}
      {expenses.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-[16px] border-border bg-white">
          <table className="w-full text-[15px]">
            <thead className="border-b border-border bg-lavender">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted">
                  Paid
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted">
                  Category
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted">
                  Amount
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={exp.paid}
                      onChange={() => togglePaid(exp.id)}
                      className="accent-violet"
                    />
                  </td>
                  <td className="px-4 py-3 text-plum">{exp.description}</td>
                  <td className="px-4 py-3 text-muted">{exp.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ${exp.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="text-[15px] text-error hover:opacity-80"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
