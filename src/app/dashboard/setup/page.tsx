"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      partner1_name: formData.get("partner1_name") as string,
      partner2_name: formData.get("partner2_name") as string,
      date: (formData.get("date") as string) || null,
      venue: (formData.get("venue") as string) || null,
      budget: formData.get("budget") ? Number(formData.get("budget")) : null,
    };

    const res = await fetch("/api/weddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Wedding created! Let's start planning.");
      router.push("/dashboard");
    } else {
      toast.error("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Set Up Your Wedding</h1>
      <p className="mt-2 text-gray-600">
        Tell us a bit about your big day to get started.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Partner 1
            </label>
            <input
              name="partner1_name"
              type="text"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Partner 2
            </label>
            <input
              name="partner2_name"
              type="text"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="First name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Wedding Date
          </label>
          <input
            name="date"
            type="date"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Venue
          </label>
          <input
            name="venue"
            type="text"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. The Grand Ballroom"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Budget
          </label>
          <input
            name="budget"
            type="number"
            min="0"
            step="100"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. 25000"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Wedding"}
        </button>
      </form>
    </div>
  );
}
