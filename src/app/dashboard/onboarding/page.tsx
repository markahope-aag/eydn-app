"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trackOnboardingComplete } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  partner1_name: string;
  partner2_name: string;
  date: string;
  budget: string;
  guest_count_estimate: string;
  venue_status: "booked" | "looking" | "nontraditional" | "";
  venue_name: string;
  venue_city: string;
  booked_vendors: string[];
};

const INITIAL_FORM: FormData = {
  partner1_name: "",
  partner2_name: "",
  date: "",
  budget: "",
  guest_count_estimate: "",
  venue_status: "",
  venue_name: "",
  venue_city: "",
  booked_vendors: [],
};

const VENDOR_CATEGORIES = [
  "Photographer",
  "Videographer",
  "Caterer",
  "DJ or Band",
  "Florist",
  "Officiant",
  "Cake/Dessert Baker",
  "Hair Stylist",
  "Makeup Artist",
  "Rentals",
  "Wedding Planner / Coordinator",
  "Transportation",
];

const VENUE_OPTIONS = [
  { value: "booked" as const, label: "Yes — we have a venue" },
  { value: "looking" as const, label: "We're still looking" },
  { value: "nontraditional" as const, label: "We're doing something non-traditional" },
];

// ─── AI Greeting Generator ───────────────────────────────────────────────────

function generateAIGreeting(form: FormData): string {
  const { partner1_name, partner2_name, date } = form;
  const p1 = partner1_name || "there";
  const p2 = partner2_name || "your partner";

  if (!date) {
    return `Hi ${p1} and ${p2}.\n\nYou haven't locked in a date yet, so we'll keep things flexible. I can see your planning details as you add them, so the more you put in, the more useful I get. What's on your mind?`;
  }

  const weddingDate = new Date(date + "T00:00:00");
  const now = new Date();
  const daysOut = Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthsOut = Math.max(1, Math.round(daysOut / 30));

  const formatted = weddingDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let variant: string;
  if (daysOut > 365) {
    variant = "You have good runway — the decisions you make now will save you real stress later.";
  } else if (daysOut > 180) {
    variant = "That's a solid planning window. A few things are worth locking in soon.";
  } else if (daysOut > 90) {
    variant = "You're in the thick of it now. Let's make sure nothing falls through the cracks.";
  } else if (daysOut > 30) {
    variant = "Things are getting real. Let's focus on what actually matters in the time you have.";
  } else {
    variant = "Almost there. This week is about execution, not decisions.";
  }

  return `Hi ${p1} and ${p2}.\n\nYou've got ${monthsOut > 1 ? `${monthsOut} months` : `${daysOut} days`} until ${formatted} — ${variant}\n\nI can see your planning details as you add them, so the more you put in, the more useful I get. What's on your mind?`;
}

// ─── Step Components ─────────────────────────────────────────────────────────

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-xl mx-auto">
      <h1 className="text-[28px] sm:text-[34px] font-semibold text-plum leading-tight">
        Wedding planning without the chaos.
      </h1>
      <p className="mt-4 text-[16px] text-muted leading-relaxed max-w-md">
        Most couples end up with five apps, two spreadsheets, and a folder full of PDFs they can never find. Eydn keeps everything in one place — your budget, vendors, guests, tasks, and day-of timeline, all talking to each other.
      </p>
      <button onClick={onNext} className="btn-primary mt-8 w-full sm:w-auto sm:min-w-[240px]">
        Let&apos;s get started
      </button>
    </div>
  );
}

// Screen 2 — Partner Names (first, so we can personalize the rest)
function PartnerNames({
  partner1,
  partner2,
  onPartner1Change,
  onPartner2Change,
}: {
  partner1: string;
  partner2: string;
  onPartner1Change: (_v: string) => void;
  onPartner2Change: (_v: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">Who&apos;s getting married?</h1>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Just first names is fine. We&apos;ll use these throughout the app.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-[14px] font-medium text-muted mb-1">Your name</label>
          <input
            type="text"
            value={partner1}
            onChange={(e) => onPartner1Change(e.target.value)}
            className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
            placeholder="First name"
            aria-label="Your name"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[14px] font-medium text-muted mb-1">Partner&apos;s name</label>
          <input
            type="text"
            value={partner2}
            onChange={(e) => onPartner2Change(e.target.value)}
            className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
            placeholder="First name"
            aria-label="Partner's name"
          />
        </div>
      </div>
    </div>
  );
}

// Screen 3 — Wedding Date (now personalized with their name)
function WeddingDate({
  partnerName,
  value,
  onChange,
  error,
  warning,
}: {
  partnerName: string;
  value: string;
  onChange: (_v: string) => void;
  error: string;
  warning?: string;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">
        When&apos;s the wedding{partnerName ? `, ${partnerName}` : ""}?
      </h1>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Everything in Eydn — your task timeline, checklist, and planning priorities — is built around this date.
      </p>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-6 w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
        aria-label="Wedding date"
      />
      {error && (
        <p className="mt-2 text-[13px] text-red-600">{error}</p>
      )}
      {warning && (
        <p className="mt-2 text-[13px] text-amber-600 bg-amber-50 rounded-[10px] px-3 py-2">{warning}</p>
      )}
      <p className="mt-3 text-[13px] text-muted leading-relaxed">
        Don&apos;t have an exact date yet? Put in your target month and we&apos;ll work from there. You can update it anytime.
      </p>
    </div>
  );
}

// Screen 4 — Budget + Guest Count (combined, both skippable)
function BudgetAndGuests({
  budget,
  guestCount,
  onBudgetChange,
  onGuestCountChange,
}: {
  budget: string;
  guestCount: string;
  onBudgetChange: (_v: string) => void;
  onGuestCountChange: (_v: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">Budget and guest count</h1>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        These two numbers drive most of your planning decisions. Estimates are fine — you can adjust both anytime.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-[14px] font-medium text-muted mb-1">Total budget</label>
          <div className="flex items-center gap-2">
            <span className="text-muted text-[20px] font-medium">$</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => onBudgetChange(e.target.value)}
              className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
              placeholder="e.g. 30,000"
              min="1"
              step="500"
              aria-label="Total budget"
              autoFocus
            />
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            The average US wedding runs $25,000 &ndash; $35,000, but what matters is what&apos;s realistic for you.
          </p>
        </div>

        <div>
          <label className="block text-[14px] font-medium text-muted mb-1">Estimated guest count</label>
          <input
            type="number"
            value={guestCount}
            onChange={(e) => onGuestCountChange(e.target.value)}
            className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
            placeholder="e.g. 120"
            min="1"
            step="1"
            aria-label="Estimated guest count"
          />
          <p className="mt-1.5 text-[12px] text-muted">
            This is your planning number — not a commitment. Most couples adjust it several times.
          </p>
        </div>
      </div>
    </div>
  );
}

// Screen 5 — Venue Status
function VenueStatus({
  status,
  venueName,
  venueCity,
  onStatusChange,
  onVenueNameChange,
  onVenueCityChange,
}: {
  status: FormData["venue_status"];
  venueName: string;
  venueCity: string;
  onStatusChange: (_v: FormData["venue_status"]) => void;
  onVenueNameChange: (_v: string) => void;
  onVenueCityChange: (_v: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">Have you booked a venue yet?</h1>
      <div className="mt-6 space-y-3">
        {VENUE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onStatusChange(opt.value)}
            className={`w-full text-left rounded-[12px] border-2 px-5 py-4 text-[15px] font-medium transition ${
              status === opt.value
                ? "border-violet bg-lavender text-violet"
                : "border-border hover:border-violet/30 text-plum"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {status === "booked" && (
        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-[14px] font-medium text-muted mb-1">Venue name</label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => onVenueNameChange(e.target.value)}
              className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
              placeholder="e.g. The Barn at Cedar Grove"
              aria-label="Venue name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-muted mb-1">City</label>
            <input
              type="text"
              value={venueCity}
              onChange={(e) => onVenueCityChange(e.target.value)}
              className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
              placeholder="e.g. Austin, TX"
              aria-label="Venue city"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Screen 6 — Booked Vendors
function BookedVendors({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (_vendor: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">Have you booked any vendors yet?</h1>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Eydn builds your task list around what you&apos;ve already done. Tap any you&apos;ve booked so we don&apos;t nag you about them.
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {VENDOR_CATEGORIES.map((vendor) => (
          <button
            key={vendor}
            type="button"
            onClick={() => onToggle(vendor)}
            className={`text-left rounded-[12px] border-2 px-4 py-3 text-[14px] font-medium transition flex items-center gap-2.5 ${
              selected.includes(vendor)
                ? "border-violet bg-lavender text-violet"
                : "border-border hover:border-violet/30 text-plum"
            }`}
          >
            <span className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
              selected.includes(vendor) ? "border-violet bg-violet" : "border-border"
            }`}>
              {selected.includes(vendor) && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            {vendor}
          </button>
        ))}
      </div>
    </div>
  );
}

// Screen 7 — AI intro + first message + input (combined)
function AIScreen({
  form,
  aiInput,
  onAIInputChange,
  onGoToDashboard,
  submitting,
}: {
  form: FormData;
  aiInput: string;
  onAIInputChange: (_v: string) => void;
  onGoToDashboard: () => void;
  submitting: boolean;
}) {
  const greeting = generateAIGreeting(form);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">
        One more thing before you dive in.
      </h1>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Eydn has a planning assistant that knows your wedding — your budget, your vendors, your timeline, all of it. It&apos;s not a chatbot. It knows your actual situation and gives you straight answers.
      </p>

      {/* AI message bubble */}
      <div className="flex gap-3 items-start mt-6">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center">
          <span className="text-[14px] font-semibold text-white">e</span>
        </div>
        <div className="flex-1 bg-lavender rounded-[16px] rounded-tl-[4px] px-5 py-4">
          <p className="text-[15px] text-plum leading-relaxed whitespace-pre-line">{greeting}</p>
        </div>
      </div>

      {/* Text input */}
      <div className="mt-5">
        <input
          type="text"
          value={aiInput}
          onChange={(e) => onAIInputChange(e.target.value)}
          placeholder="Ask anything, or head to your dashboard..."
          className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
          aria-label="Message Eydn"
        />
      </div>

      {/* Dashboard button — always visible */}
      <button
        onClick={onGoToDashboard}
        disabled={submitting}
        className="btn-primary mt-6 w-full disabled:opacity-50"
      >
        {submitting ? "Setting up..." : "Go to my dashboard"}
      </button>
    </div>
  );
}

// ─── Budget Category Allocations ─────────────────────────────────────────────

const BUDGET_ALLOCATIONS = [
  { category: "Ceremony & Venue", pct: 0.30 },
  { category: "Food & Beverage", pct: 0.25 },
  { category: "Photography & Video", pct: 0.12 },
  { category: "Music & Entertainment", pct: 0.08 },
  { category: "Florals & Decor", pct: 0.08 },
  { category: "Attire & Beauty", pct: 0.07 },
  { category: "Stationery & Postage", pct: 0.02 },
  { category: "Gifts & Favors", pct: 0.02 },
  { category: "Miscellaneous", pct: 0.06 },
];

// ─── Steps ───────────────────────────────────────────────────────────────────
// 0: Welcome (no progress bar)
// 1: Partner Names
// 2: Wedding Date
// 3: Budget + Guest Count
// 4: Venue Status
// 5: Booked Vendors
// 6: AI (intro + greeting + input)

const TOTAL_STEPS = 7;
const PROGRESS_STEPS = TOTAL_STEPS - 1; // exclude Welcome

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReview = searchParams.get("review") === "true";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");
  const [dateChangeWarning, setDateChangeWarning] = useState("");
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [aiInput, setAIInput] = useState("");
  const [ready, setReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if already onboarded → redirect (unless reviewing)
  useEffect(() => {
    if (isReview) {
      fetch("/api/weddings")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            if (data.date) setOriginalDate(data.date);
            setForm((prev) => ({
              ...prev,
              partner1_name: data.partner1_name || "",
              partner2_name: data.partner2_name || "",
              date: data.date || "",
              budget: data.budget ? String(data.budget) : "",
              guest_count_estimate: data.guest_count_estimate ? String(data.guest_count_estimate) : "",
              venue_name: data.venue || "",
              venue_city: data.venue_city || "",
              venue_status: data.venue ? "booked" : "",
            }));
            setStep(1);
          }
          setReady(true);
        })
        .catch(() => setReady(true));
      return;
    }

    fetch("/api/weddings")
      .then((r) => {
        if (r.ok) {
          router.replace("/dashboard");
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, [router, isReview]);

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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

  function validateDate(d: string): boolean {
    if (!d) return true;
    const weddingDate = new Date(d + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (weddingDate < today) {
      setDateError("That date has already passed — did you mean a future date?");
      return false;
    }
    setDateError("");
    return true;
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: // Partner Names
        return !!form.partner1_name.trim() && !!form.partner2_name.trim();
      case 2: // Wedding Date
        return !!form.date && !dateError;
      case 3: // Budget + Guest Count — always proceed (both optional)
        return true;
      case 4: // Venue Status
        if (!form.venue_status) return false;
        if (form.venue_status === "booked" && !form.venue_name.trim()) return false;
        return true;
      case 5: // Booked Vendors — always proceed (none is fine)
        return true;
      default:
        return true;
    }
  }

  function getCTALabel(): string {
    switch (step) {
      case 1: return "Nice to meet you both";
      case 2: return "That's the date";
      case 3: return "Continue";
      case 4: return "Continue";
      case 5: return form.booked_vendors.length > 0
        ? `Continue with ${form.booked_vendors.length} booked`
        : "None yet — continue";
      default: return "Continue";
    }
  }

  function getSkipLabel(): string | null {
    switch (step) {
      case 3: return "I'll add these later";
      default: return null;
    }
  }

  function handleNext() {
    if (step === 2 && form.date && !validateDate(form.date)) return;
    if (step === 3 && form.budget && Number(form.budget) <= 0) return;
    if (step === 3 && form.guest_count_estimate && (Number(form.guest_count_estimate) <= 0 || !Number.isInteger(Number(form.guest_count_estimate)))) return;

    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner1_name: form.partner1_name,
          partner2_name: form.partner2_name,
          date: form.date || null,
          venue: form.venue_name || null,
          venue_city: form.venue_city || null,
          budget: form.budget ? Number(form.budget) : null,
          guest_count_estimate: form.guest_count_estimate ? Number(form.guest_count_estimate) : null,
          venue_status: form.venue_status || null,
          booked_vendors: form.booked_vendors,
          budget_allocations: form.budget ? BUDGET_ALLOCATIONS.map((a) => ({
            category: a.category,
            allocated: Math.round(Number(form.budget) * a.pct),
          })) : null,
          responses: form,
        }),
      });

      if (res.ok) {
        trackOnboardingComplete();
        if (aiInput.trim()) {
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: aiInput.trim() }),
          }).catch((err) => console.error("Failed to seed AI chat", err));
        }
        router.push("/dashboard");
      } else {
        toast.error("Setup didn't save. Try once more — if it keeps happening, reach out to support@eydn.app.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <p className="text-[15px] text-muted py-12 text-center">One moment...</p>;
  }

  // Screen 1 — Welcome (no progress bar)
  if (step === 0) {
    return (
      <div className="px-6 py-12" ref={contentRef}>
        <Welcome onNext={() => setStep(1)} />
      </div>
    );
  }

  // Screen 7 — AI screen (no back button, no standard nav)
  if (step === 6) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto" ref={contentRef}>
        <div className="flex gap-1 mb-10">
          {Array.from({ length: PROGRESS_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? "bg-violet" : "bg-lavender"
              }`}
            />
          ))}
        </div>
        <AIScreen
          form={form}
          aiInput={aiInput}
          onAIInputChange={setAIInput}
          onGoToDashboard={handleComplete}
          submitting={submitting}
        />
      </div>
    );
  }

  // Screens 2–6
  const skipLabel = getSkipLabel();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto" ref={contentRef}>
      {/* Progress bar */}
      <div className="flex gap-1 mb-10">
        {Array.from({ length: PROGRESS_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? "bg-violet" : "bg-lavender"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <PartnerNames
          partner1={form.partner1_name}
          partner2={form.partner2_name}
          onPartner1Change={(v) => update("partner1_name", v)}
          onPartner2Change={(v) => update("partner2_name", v)}
        />
      )}
      {step === 2 && (
        <WeddingDate
          partnerName={form.partner1_name}
          value={form.date}
          onChange={(v) => {
            update("date", v);
            validateDate(v);
            if (isReview && originalDate && v && v !== originalDate) {
              setDateChangeWarning("Changing your wedding date will automatically update your rehearsal dinner date and shift planning milestone dates. Any appointments you've added (fittings, tastings, trials) will NOT be moved — you'll need to reschedule those with your vendors.");
            } else {
              setDateChangeWarning("");
            }
          }}
          error={dateError}
          warning={dateChangeWarning}
        />
      )}
      {step === 3 && (
        <BudgetAndGuests
          budget={form.budget}
          guestCount={form.guest_count_estimate}
          onBudgetChange={(v) => update("budget", v)}
          onGuestCountChange={(v) => update("guest_count_estimate", v)}
        />
      )}
      {step === 4 && (
        <VenueStatus
          status={form.venue_status}
          venueName={form.venue_name}
          venueCity={form.venue_city}
          onStatusChange={(v) => update("venue_status", v)}
          onVenueNameChange={(v) => update("venue_name", v)}
          onVenueCityChange={(v) => update("venue_city", v)}
        />
      )}
      {step === 5 && (
        <BookedVendors
          selected={form.booked_vendors}
          onToggle={toggleVendor}
        />
      )}

      {/* Navigation */}
      <div className="mt-10 max-w-md mx-auto">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {getCTALabel()}
        </button>

        {skipLabel && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="block mx-auto mt-3 text-[14px] text-muted hover:text-plum transition"
          >
            {skipLabel}
          </button>
        )}

        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="block mx-auto mt-4 text-[14px] text-muted hover:text-plum transition"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
