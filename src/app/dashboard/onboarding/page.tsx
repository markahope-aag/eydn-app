"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EdynMessage } from "@/components/EdynMessage";
import { trackOnboardingComplete } from "@/lib/analytics";

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

/** Yes/Not yet toggle button pair */
function YesNotYet({
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "Not yet",
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 rounded-[10px] border-border px-4 py-2.5 text-[15px] font-semibold transition ${
          value === true
            ? "border-violet bg-lavender text-violet"
            : "hover:bg-lavender"
        }`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 rounded-[10px] border-border px-4 py-2.5 text-[15px] font-semibold transition ${
          value === false
            ? "border-violet bg-lavender text-violet"
            : "hover:bg-lavender"
        }`}
      >
        {noLabel}
      </button>
    </div>
  );
}

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
        if (data?.responses) {
          const saved = data.responses as Partial<FormData>;
          setForm((prev) => ({ ...prev, ...saved }));
          if (data.completed) {
            setStep(0);
          } else {
            const lastStep = (saved as Record<string, unknown>).last_step;
            if (typeof lastStep === "number") setStep(lastStep);
          }
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
    }).catch(() => {});
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "names":
        return !!form.partner1_name.trim() && !!form.partner2_name.trim();
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
        trackOnboardingComplete();
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
        {/* STEP: Names */}
        {currentStep === "names" && (
          <>
            <EdynMessage message="Hey! Let's get started with the basics so we can plan your perfect day. What are your names?" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[15px] font-semibold text-muted">Your Name</label>
                <input
                  type="text"
                  value={form.partner1_name}
                  onChange={(e) => update("partner1_name", e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                  placeholder="First name"
                  aria-label="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-[15px] font-semibold text-muted">Partner&apos;s Name</label>
                <input
                  type="text"
                  value={form.partner2_name}
                  onChange={(e) => update("partner2_name", e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                  placeholder="First name"
                  aria-label="Partner's name"
                  required
                />
              </div>
            </div>
          </>
        )}

        {/* STEP: Date */}
        {currentStep === "date" && (
          <>
            <EdynMessage message={`Great to meet you, ${form.partner1_name}! Do you have a wedding date set?`} />
            <YesNotYet
              value={form.has_date ? true : form.has_date === false && !form.date ? false : null}
              onChange={(v) => { update("has_date", v); if (!v) update("date", ""); }}
              yesLabel="We have a date"
              noLabel="Not yet"
            />
            {form.has_date && (
              <>
                <EdynMessage message="Wonderful! When is the big day?" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  aria-label="Wedding date"
                  className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                />
              </>
            )}
            {form.has_date === false && (
              <EdynMessage message="No worries! We'll help you plan around a flexible timeline." />
            )}
          </>
        )}

        {/* STEP: Venue */}
        {currentStep === "venue" && (
          <>
            <EdynMessage message="Do you have a venue booked?" />
            <YesNotYet
              value={form.has_venue ? true : form.has_venue === false && !form.venue ? false : null}
              onChange={(v) => { update("has_venue", v); if (!v) update("venue", ""); }}
              yesLabel="We have one"
              noLabel="Still looking"
            />
            {form.has_venue && (
              <>
                <EdynMessage message="Love it! What's the venue called?" />
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  placeholder="e.g. The Grand Ballroom"
                  aria-label="Venue name"
                  className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                />
              </>
            )}
            {form.has_venue === false && (
              <EdynMessage message="No problem! We'll add venue research to your task list." />
            )}
          </>
        )}

        {/* STEP: Guests */}
        {currentStep === "guests" && (
          <>
            <EdynMessage message="How about your guest list — do you have a rough idea of how many people you're inviting?" />
            <YesNotYet
              value={form.has_guest_estimate ? true : form.has_guest_estimate === false && !form.guest_count_estimate ? false : null}
              onChange={(v) => { update("has_guest_estimate", v); if (!v) update("guest_count_estimate", ""); }}
              yesLabel="We have an estimate"
              noLabel="Not sure yet"
            />
            {form.has_guest_estimate && (
              <>
                <EdynMessage message="Great! Roughly how many guests are you thinking?" />
                <input
                  type="number"
                  value={form.guest_count_estimate}
                  onChange={(e) => update("guest_count_estimate", e.target.value)}
                  placeholder="e.g. 150"
                  min="1"
                  aria-label="Estimated guest count"
                  className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                />
              </>
            )}
            {form.has_guest_estimate === false && (
              <EdynMessage message="That's totally fine! The guest list tool will help you figure it out." />
            )}
          </>
        )}

        {/* STEP: Style */}
        {currentStep === "style" && (
          <>
            <EdynMessage message="Now for the fun part — how would you describe your wedding vibe in a few words?" />
            <input
              type="text"
              value={form.style_description}
              onChange={(e) => update("style_description", e.target.value)}
              placeholder="e.g. Rustic, elegant, outdoor"
              aria-label="Wedding style description"
              className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
            />
          </>
        )}

        {/* STEP: Wedding Party */}
        {currentStep === "wedding_party" && (
          <>
            <EdynMessage message="Do you already have a wedding party lined up?" />
            <YesNotYet
              value={form.has_wedding_party}
              onChange={(v) => { update("has_wedding_party", v); if (!v) update("wedding_party_count", ""); }}
            />
            {form.has_wedding_party === true && (
              <>
                <EdynMessage message="Great! How many people will be in your wedding party total?" />
                <input
                  type="number"
                  value={form.wedding_party_count}
                  onChange={(e) => update("wedding_party_count", e.target.value)}
                  placeholder="e.g. 8"
                  min="1"
                  aria-label="Wedding party count"
                  className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                />
              </>
            )}
            {form.has_wedding_party === false && (
              <EdynMessage message="No worries! We can help you plan who to ask later." />
            )}
          </>
        )}

        {/* STEP: Vendors */}
        {currentStep === "vendors" && (
          <>
            <EdynMessage message="Let's see where you're at with vendors. Which of these have you already booked?" />
            <div className="grid gap-2 sm:grid-cols-2">
              {VENDOR_CATEGORIES.map((vendor) => (
                <button
                  key={vendor}
                  type="button"
                  onClick={() => toggleVendor(vendor)}
                  className={`flex items-center gap-2 rounded-[10px] border-border px-3 py-2.5 text-[15px] text-left transition ${
                    form.booked_vendors.includes(vendor)
                      ? "border-violet bg-lavender text-violet font-semibold"
                      : "hover:bg-lavender"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    form.booked_vendors.includes(vendor)
                      ? "border-violet bg-violet"
                      : "border-border"
                  }`}>
                    {form.booked_vendors.includes(vendor) && (
                      <span className="text-white text-[10px]">✓</span>
                    )}
                  </span>
                  {vendor}
                </button>
              ))}
            </div>
            {form.booked_vendors.length === 0 && (
              <EdynMessage message="No vendors booked yet? That's completely normal! We'll help you find and manage them." />
            )}
            {form.booked_vendors.length > 0 && (
              <EdynMessage message={`Nice — ${form.booked_vendors.length} vendor${form.booked_vendors.length > 1 ? "s" : ""} already locked in!`} />
            )}
          </>
        )}

        {/* STEP: Budget */}
        {currentStep === "budget" && (
          <>
            <EdynMessage message="Do you have a wedding budget in mind?" />
            <YesNotYet
              value={form.has_budget ? true : form.has_budget === false && !form.budget ? false : null}
              onChange={(v) => { update("has_budget", v); if (!v) update("budget", ""); }}
              yesLabel="We have a budget"
              noLabel="Not sure yet"
            />
            {form.has_budget && (
              <>
                <EdynMessage message="Smart! What's the total budget you're working with?" />
                <div className="flex items-center gap-2">
                  <span className="text-muted text-[18px]">$</span>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                    placeholder="e.g. 25,000"
                    min="0"
                    step="500"
                    aria-label="Wedding budget"
                    className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px]"
                  />
                </div>
              </>
            )}
            {form.has_budget === false && (
              <EdynMessage message="No problem! The budget tracker will help you figure out what to allocate where." />
            )}
          </>
        )}

        {/* STEP: Pre-wedding Events */}
        {currentStep === "pre_wedding" && (
          <>
            <EdynMessage message="Are you planning any pre-wedding celebrations — bridal shower, bachelor/bachelorette parties?" />
            <YesNotYet
              value={form.has_pre_wedding_events}
              onChange={(v) => update("has_pre_wedding_events", v)}
              yesLabel="Yes, we are"
              noLabel="Not at this point"
            />
            {form.has_pre_wedding_events === true && (
              <EdynMessage message="Fun! We'll add those to your planning timeline." />
            )}
            {form.has_pre_wedding_events === false && (
              <EdynMessage message="That's totally fine! Less to plan means more time to enjoy the journey." />
            )}
          </>
        )}

        {/* STEP: Honeymoon */}
        {currentStep === "honeymoon" && (
          <>
            <EdynMessage message="What about a honeymoon — are you planning one?" />
            <YesNotYet
              value={form.has_honeymoon}
              onChange={(v) => update("has_honeymoon", v)}
              yesLabel="Yes!"
              noLabel="Not yet"
            />
            {form.has_honeymoon === true && (
              <EdynMessage message="Exciting! We'll keep track of bookings, flights, and packing reminders for you." />
            )}
            {form.has_honeymoon === false && (
              <EdynMessage message="No worries! If you decide to later, we can add a honeymoon planning checklist." />
            )}
          </>
        )}

        {/* STEP: Anything Else */}
        {currentStep === "anything_else" && (
          <>
            <EdynMessage message="We've got a great starting point! Is there anything else you'd like me to know before we dive in?" />
            <textarea
              value={form.anything_else}
              onChange={(e) => update("anything_else", e.target.value)}
              placeholder="Share any other details, preferences, or concerns..."
              rows={4}
              aria-label="Additional details"
              className="w-full rounded-[10px] border-border px-3 py-2.5 text-[15px] resize-none"
            />
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-ghost"
          >
            Back
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {currentStep !== "names" && !isLast && (
            <button
              type="button"
              onClick={async () => {
                await saveProgress();
                setStep((s) => s + 1);
              }}
              className="text-[15px] text-muted hover:text-plum transition"
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="btn-primary disabled:opacity-50"
          >
            {submitting
              ? "Setting up..."
              : isLast
              ? "Start Planning!"
              : "Continue"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-muted">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}
