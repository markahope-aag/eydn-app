"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EdynMessage } from "@/components/EdynMessage";

const VENDOR_CATEGORIES = [
  "Venue",
  "Caterer",
  "Photographer",
  "Videographer",
  "DJ or Band",
  "Officiant",
  "Florist",
  "Cake/Dessert Baker",
  "Hair Stylist",
  "Makeup Artist",
  "Rentals",
  "Wedding Planner / Day-of Coordinator",
  "Transportation",
];

type FormData = {
  partner1_name: string;
  partner2_name: string;
  has_date: boolean;
  date: string;
  has_venue: boolean;
  venue: string;
  has_guest_estimate: boolean;
  guest_count_estimate: string;
  style_description: string;
  has_wedding_party: boolean | null;
  wedding_party_count: string;
  booked_vendors: string[];
  has_budget: boolean;
  budget: string;
  has_pre_wedding_events: boolean | null;
  has_honeymoon: boolean | null;
  anything_else: string;
};

const INITIAL_FORM: FormData = {
  partner1_name: "",
  partner2_name: "",
  has_date: false,
  date: "",
  has_venue: false,
  venue: "",
  has_guest_estimate: false,
  guest_count_estimate: "",
  style_description: "",
  has_wedding_party: null,
  wedding_party_count: "",
  booked_vendors: [],
  has_budget: false,
  budget: "",
  has_pre_wedding_events: null,
  has_honeymoon: null,
  anything_else: "",
};

const STEPS = [
  "names",
  "date",
  "venue",
  "guests",
  "style",
  "wedding_party",
  "vendors",
  "budget",
  "pre_wedding",
  "honeymoon",
  "anything_else",
] as const;

type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Check for existing partial questionnaire
  useEffect(() => {
    fetch("/api/questionnaire")
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data?.responses && !data.completed) {
          const saved = data.responses as Partial<FormData>;
          setForm((prev) => ({ ...prev, ...saved }));
          // Find the last filled step
          const lastStep = (saved as Record<string, unknown>).last_step;
          if (typeof lastStep === "number") setStep(lastStep);
        }
      })
      .finally(() => setResumeChecked(true));
  }, []);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleVendor(vendor: string) {
    setForm((prev) => ({
      ...prev,
      booked_vendors: prev.booked_vendors.includes(vendor)
        ? prev.booked_vendors.filter((v) => v !== vendor)
        : [...prev.booked_vendors, vendor],
    }));
  }

  async function saveProgress() {
    await fetch("/api/questionnaire", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: { ...form, last_step: step },
        completed: false,
      }),
    }).catch(() => {}); // silent save
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "names":
        return !!form.partner1_name.trim() && !!form.partner2_name.trim();
      case "date":
        return true; // optional
      case "venue":
        return true; // optional
      case "guests":
        return true; // optional
      default:
        return true;
    }
  }

  async function handleNext() {
    if (!canProceed()) return;
    await saveProgress();
    if (isLast) {
      await handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner1_name: form.partner1_name,
          partner2_name: form.partner2_name,
          date: form.date || null,
          venue: form.venue || null,
          budget: form.budget ? Number(form.budget) : null,
          guest_count_estimate: form.guest_count_estimate
            ? Number(form.guest_count_estimate)
            : null,
          style_description: form.style_description || null,
          has_wedding_party: form.has_wedding_party,
          wedding_party_count: form.wedding_party_count
            ? Number(form.wedding_party_count)
            : null,
          has_pre_wedding_events: form.has_pre_wedding_events,
          has_honeymoon: form.has_honeymoon,
          booked_vendors: form.booked_vendors,
          responses: form,
        }),
      });

      if (res.ok) {
        toast.success("Your planning journey begins now!");
        router.push("/dashboard");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!resumeChecked) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-violet" : "bg-lavender"
            }`}
          />
        ))}
      </div>

      <div className="space-y-6">
        {currentStep === "names" && (
          <>
            <EdynMessage message="Hey! Let's get started with the basics so we can plan your perfect day. Let's start with yours and your partner's names." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[15px] font-semibold text-muted">
                  Your Name
                </label>
                <input
                  type="text"
                  value={form.partner1_name}
                  onChange={(e) => update("partner1_name", e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-[15px] font-semibold text-muted">
                  Partner&apos;s Name
                </label>
                <input
                  type="text"
                  value={form.partner2_name}
                  onChange={(e) => update("partner2_name", e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                  placeholder="First name"
                  required
                />
              </div>
            </div>
          </>
        )}

        {currentStep === "date" && (
          <>
            <EdynMessage
              message={`Great, excited to work with you ${form.partner1_name}! Let's get into it. What's your wedding date?`}
            />
            <div>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={form.has_date}
                  onChange={(e) => update("has_date", e.target.checked)}
                  className="accent-violet"
                />
                We have a date picked
              </label>
              {form.has_date && (
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="mt-3 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              )}
            </div>
          </>
        )}

        {currentStep === "venue" && (
          <>
            <EdynMessage message="Awesome! And where's the big day happening?" />
            <div>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={form.has_venue}
                  onChange={(e) => update("has_venue", e.target.checked)}
                  className="accent-violet"
                />
                We have a venue booked
              </label>
              {form.has_venue && (
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  placeholder="e.g. The Grand Ballroom"
                  className="mt-3 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              )}
            </div>
          </>
        )}

        {currentStep === "guests" && (
          <>
            <EdynMessage message="Got it. How many guests are you thinking of inviting? This helps us plan seating, catering, and everything else." />
            <div>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={form.has_guest_estimate}
                  onChange={(e) =>
                    update("has_guest_estimate", e.target.checked)
                  }
                  className="accent-violet"
                />
                We have a rough estimate
              </label>
              {form.has_guest_estimate && (
                <input
                  type="number"
                  value={form.guest_count_estimate}
                  onChange={(e) =>
                    update("guest_count_estimate", e.target.value)
                  }
                  placeholder="e.g. 150"
                  min="1"
                  className="mt-3 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              )}
            </div>
          </>
        )}

        {currentStep === "style" && (
          <>
            <EdynMessage message="Now, let's talk vibes. How would you describe your wedding style in a few words?" />
            <input
              type="text"
              value={form.style_description}
              onChange={(e) => update("style_description", e.target.value)}
              placeholder="e.g. Rustic, elegant, outdoor"
              className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </>
        )}

        {currentStep === "wedding_party" && (
          <>
            <EdynMessage message="Perfect! Do you already have a wedding party lined up?" />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update("has_wedding_party", true)}
                className={`flex-1 rounded-[10px] border-border px-4 py-2 text-[15px] font-semibold transition ${
                  form.has_wedding_party === true
                    ? "border-violet bg-lavender text-violet"
                    : "hover:bg-lavender"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => update("has_wedding_party", false)}
                className={`flex-1 rounded-[10px] border-border px-4 py-2 text-[15px] font-semibold transition ${
                  form.has_wedding_party === false
                    ? "border-violet bg-lavender text-violet"
                    : "hover:bg-lavender"
                }`}
              >
                Not yet
              </button>
            </div>
            {form.has_wedding_party === true && (
              <>
                <EdynMessage message="Great! How many people will be in your wedding party total?" />
                <input
                  type="number"
                  value={form.wedding_party_count}
                  onChange={(e) =>
                    update("wedding_party_count", e.target.value)
                  }
                  placeholder="e.g. 8"
                  min="1"
                  className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </>
            )}
            {form.has_wedding_party === false && (
              <EdynMessage message="No worries, we can help you plan who to ask later!" />
            )}
          </>
        )}

        {currentStep === "vendors" && (
          <>
            <EdynMessage message="Time to see where you're at with vendors. Which of these have you already booked?" />
            <div className="grid gap-2 sm:grid-cols-2">
              {VENDOR_CATEGORIES.map((vendor) => (
                <label
                  key={vendor}
                  className={`flex items-center gap-2 rounded-[10px] border-border px-3 py-2 text-[15px] cursor-pointer transition ${
                    form.booked_vendors.includes(vendor)
                      ? "border-violet bg-lavender"
                      : "hover:bg-lavender"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.booked_vendors.includes(vendor)}
                    onChange={() => toggleVendor(vendor)}
                    className="accent-violet"
                  />
                  {vendor}
                </label>
              ))}
            </div>
          </>
        )}

        {currentStep === "budget" && (
          <>
            <EdynMessage message="Perfect. Knowing this helps us suggest what to focus on next. And roughly, what's your wedding budget?" />
            <div>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={form.has_budget}
                  onChange={(e) => update("has_budget", e.target.checked)}
                  className="accent-violet"
                />
                We have a budget in mind
              </label>
              {form.has_budget && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-muted">$</span>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                    placeholder="e.g. 25000"
                    min="0"
                    step="500"
                    className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {currentStep === "pre_wedding" && (
          <>
            <EdynMessage message="Are you planning any pre-wedding celebrations like a bridal shower or bachelor/bachelorette parties?" />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update("has_pre_wedding_events", true)}
                className={`flex-1 rounded-[10px] border-border px-4 py-2 text-[15px] font-semibold transition ${
                  form.has_pre_wedding_events === true
                    ? "border-violet bg-lavender text-violet"
                    : "hover:bg-lavender"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => update("has_pre_wedding_events", false)}
                className={`flex-1 rounded-[10px] border-border px-4 py-2 text-[15px] font-semibold transition ${
                  form.has_pre_wedding_events === false
                    ? "border-violet bg-lavender text-violet"
                    : "hover:bg-lavender"
                }`}
              >
                Not yet
              </button>
            </div>
          </>
        )}

        {currentStep === "honeymoon" && (
          <>
            <EdynMessage message="Fun! And what about a honeymoon? Have you started planning that yet?" />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update("has_honeymoon", true)}
                className={`flex-1 rounded-[10px] border-border px-4 py-2 text-[15px] font-semibold transition ${
                  form.has_honeymoon === true
                    ? "border-violet bg-lavender text-violet"
                    : "hover:bg-lavender"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => update("has_honeymoon", false)}
                className={`flex-1 rounded-[10px] border-border px-4 py-2 text-[15px] font-semibold transition ${
                  form.has_honeymoon === false
                    ? "border-violet bg-lavender text-violet"
                    : "hover:bg-lavender"
                }`}
              >
                Not yet
              </button>
            </div>
            {form.has_honeymoon === false && (
              <EdynMessage message="No problem! We can add a honeymoon planning checklist for you." />
            )}
            {form.has_honeymoon === true && (
              <EdynMessage message="Great! Let's keep track of bookings, flights, and packing reminders." />
            )}
          </>
        )}

        {currentStep === "anything_else" && (
          <>
            <EdynMessage message="Now we have a great starting point. Anything else you would like me to know before I start to help you plan?" />
            <textarea
              value={form.anything_else}
              onChange={(e) => update("anything_else", e.target.value)}
              placeholder="Share any other details, preferences, or concerns..."
              rows={4}
              className="w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
            />
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-ghost"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed() || submitting}
          className="btn-primary disabled:opacity-50 ml-auto"
        >
          {submitting
            ? "Setting up..."
            : isLast
            ? "Start Planning!"
            : "Continue"}
        </button>
      </div>

      <p className="mt-4 text-center text-[12px] text-muted">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}
