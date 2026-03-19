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
    return <p className="text-sm text-gray-400 py-8">Loading budget...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Budget</h1>

      {/* Budget overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Budget</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg text-gray-400">$</span>
            <input
              type="number"
              value={budget || ""}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              placeholder="0"
              className="text-2xl font-bold text-gray-900 w-full outline-none"
            />
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Spent</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Remaining</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              remaining < 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {budget > 0 && (
        <div className="mt-4 h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              totalSpent > budget ? "bg-red-500" : "bg-rose-500"
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
          className="rounded-lg border px-3 py-2 text-sm flex-1"
          required
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm w-32"
          min="0"
          step="0.01"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Add
        </button>
      </form>

      {/* Expense list */}
      {expenses.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Paid
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Category
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Amount
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={exp.paid}
                      onChange={() => togglePaid(exp.id)}
                      className="accent-rose-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900">{exp.description}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.category}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${exp.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="text-sm text-red-600 hover:text-red-500"
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
