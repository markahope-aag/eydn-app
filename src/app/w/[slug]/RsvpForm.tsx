"use client";

import { useState } from "react";
import { toast } from "sonner";

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

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
              onChange={(e) => setPlusOneName(titleCase(e.target.value))}
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

type NameLookupProps = {
  weddingSlug: string;
};

export function RsvpNameLookup({ weddingSlug }: NameLookupProps) {
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [foundGuest, setFoundGuest] = useState<{
    token: string;
    guest_id: string;
    guest_name: string;
    responded: boolean;
  } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSearching(true);
    setError("");

    try {
      const res = await fetch("/api/public/rsvp-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), wedding_slug: weddingSlug }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setFoundGuest(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  if (foundGuest) {
    if (foundGuest.responded) {
      return (
        <div className="bg-white border border-border rounded-[20px] p-10">
          <p className="text-[16px] text-muted">
            Thank you, <span className="font-semibold text-plum">{foundGuest.guest_name}</span>! Your RSVP has already been recorded.
          </p>
        </div>
      );
    }

    return (
      <RsvpForm
        token={foundGuest.token}
        guestName={foundGuest.guest_name}
        guestId={foundGuest.guest_id}
        weddingSlug={weddingSlug}
      />
    );
  }

  return (
    <form onSubmit={handleSearch} className="card p-8 text-center">
      <p className="text-[16px] text-muted mb-6">
        Find your name to RSVP
      </p>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(titleCase(e.target.value))}
          placeholder="Your full name"
          className="w-full rounded-[12px] border border-border px-5 py-3 text-[16px] text-center focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        {error && (
          <p className="text-[14px] text-red-500">{error}</p>
        )}
        <button
          type="submit"
          disabled={searching || !name.trim()}
          className="btn-primary w-full"
        >
          {searching ? "Searching..." : "Find My Name"}
        </button>
      </div>
    </form>
  );
}
