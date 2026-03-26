"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  token: string;
  guestName: string;
  guestId: string;
  weddingSlug: string;
};

export function RsvpForm({ token, guestName }: Props) {
  const [status, setStatus] = useState<"accepted" | "declined" | null>(null);
  const [mealPreference, setMealPreference] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rsvp_status: status,
          meal_preference: status === "accepted" ? mealPreference : null,
          plus_one_name: status === "accepted" ? plusOneName : null,
        }),
      });

      if (!res.ok) throw new Error();
      setSubmitted(true);
      toast.success("RSVP received");
    } catch {
      toast.error("That didn't go through. Try submitting again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="text-[32px] mb-4">&#10003;</div>
        <p className="text-[15px] font-semibold text-plum">
          Thank you, {guestName}!
        </p>
        <p className="mt-2 text-[15px] text-muted">
          {status === "accepted"
            ? "We can't wait to celebrate with you!"
            : "We're sorry you can't make it. You'll be missed!"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-8 text-left">
      <p className="text-[15px] text-muted text-center mb-6">
        Hello, <span className="font-semibold text-plum">{guestName}</span>!
        Will you be joining us?
      </p>

      <div className="flex gap-3 justify-center mb-6">
        <button
          type="button"
          onClick={() => setStatus("accepted")}
          className={`px-6 py-2 rounded-full text-[15px] font-semibold transition border ${
            status === "accepted"
              ? "bg-violet text-white border-violet"
              : "border-border text-muted hover:border-violet hover:text-violet"
          }`}
        >
          Joyfully Accept
        </button>
        <button
          type="button"
          onClick={() => setStatus("declined")}
          className={`px-6 py-2 rounded-full text-[15px] font-semibold transition border ${
            status === "declined"
              ? "bg-plum text-white border-plum"
              : "border-border text-muted hover:border-plum hover:text-plum"
          }`}
        >
          Respectfully Decline
        </button>
      </div>

      {status === "accepted" && (
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-muted block mb-1">
              Meal Preference
            </label>
            <select
              value={mealPreference}
              onChange={(e) => setMealPreference(e.target.value)}
              className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
            >
              <option value="">Select...</option>
              <option value="chicken">Chicken</option>
              <option value="beef">Beef</option>
              <option value="fish">Fish</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-muted block mb-1">
              Plus One Name (if applicable)
            </label>
            <input
              type="text"
              value={plusOneName}
              onChange={(e) => setPlusOneName(e.target.value)}
              placeholder="Guest name"
              className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
            />
          </div>
        </div>
      )}

      {status && (
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full mt-6"
        >
          {submitting ? "Sending..." : "Submit RSVP"}
        </button>
      )}
    </form>
  );
}
