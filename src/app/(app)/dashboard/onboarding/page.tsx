"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { trackOnboardingComplete } from "@/lib/analytics";
import { Confetti, triggerConfetti } from "@/components/Confetti";

// Soft bouquet shot used as the celebratory background after onboarding
// completes. Picked once via scripts/fetch-celebration-image.mjs (which also
// fired Unsplash's required download_location ping).
const CELEBRATION_PHOTO = {
  url: "https://images.unsplash.com/photo-1769251296969-a4c7aa0b4478?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnQlMjBldmVuaW5nfGVufDF8MHx8fDE3NzgwMTk1NDl8MA&ixlib=rb-4.1.0&q=80&w=1920",
  alt: "A soft bouquet of light pink and white flowers",
  photographer: "Cuvii",
  photographerUrl: "https://unsplash.com/@cuvii?utm_source=eydn-app&utm_medium=referral",
  unsplashUrl: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
};

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
  partner_invite_email: string;
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
  partner_invite_email: "",
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

// Format a raw number string as currency display (e.g. "30000" → "30,000")
function formatCurrency(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
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
  // Display formatted value but store raw digits
  const [budgetDisplay, setBudgetDisplay] = useState(() => formatCurrency(budget));
  const [notSureYet, setNotSureYet] = useState(false);

  function handleBudgetChange(display: string) {
    const digits = display.replace(/[^0-9]/g, "");
    setBudgetDisplay(digits ? Number(digits).toLocaleString("en-US") : "");
    onBudgetChange(digits);
  }

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
              type="text"
              inputMode="numeric"
              value={budgetDisplay}
              onChange={(e) => handleBudgetChange(e.target.value)}
              className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
              placeholder="e.g. 30,000"
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
          {!notSureYet ? (
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
          ) : (
            <div className="w-full rounded-[10px] border-border bg-lavender/30 px-4 py-3.5 text-[15px] text-muted">
              No worries — you can add this later in Settings.
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-3">
            <p className="text-[12px] text-muted flex-1">
              {notSureYet
                ? "A rough estimate helps with venue and catering planning, but it's completely optional."
                : "This is your planning number — not a commitment. Most couples adjust it several times."}
            </p>
            <button
              type="button"
              onClick={() => {
                setNotSureYet(!notSureYet);
                if (!notSureYet) onGuestCountChange("");
              }}
              className="text-[12px] text-violet font-medium whitespace-nowrap hover:underline"
            >
              {notSureYet ? "Add an estimate" : "Not sure yet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Venue search result from the directory
type VenueSuggestion = { id: string; name: string; city: string; state: string; rating?: number };

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
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const searchVenues = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggested-vendors?category=Venue&q=${encodeURIComponent(query)}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          const results = (data.vendors || []).map((v: { id: string; name: string; city: string; state: string }) => ({
            id: v.id,
            name: v.name,
            city: v.city,
            state: v.state,
          }));
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        }
      } catch {
        // Silently fail — user can still type manually
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectVenue(venue: VenueSuggestion) {
    onVenueNameChange(venue.name);
    onVenueCityChange(`${venue.city}, ${venue.state}`);
    setShowSuggestions(false);
  }

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
      {(status === "looking" || status === "nontraditional") && (
        <div className="mt-5">
          <label className="block text-[14px] font-medium text-muted mb-1">Where are you planning?</label>
          <input
            type="text"
            value={venueCity}
            onChange={(e) => onVenueCityChange(e.target.value)}
            className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
            placeholder="e.g. Austin, TX"
            aria-label="Wedding city"
          />
          <p className="mt-1.5 text-[12px] text-muted">Helps Eydn find local vendors and venues for you.</p>
        </div>
      )}
      {status === "booked" && (
        <div className="mt-5 space-y-3">
          <div ref={wrapperRef} className="relative">
            <label className="block text-[14px] font-medium text-muted mb-1">Venue name</label>
            <div className="relative">
              <input
                type="text"
                value={venueName}
                onChange={(e) => {
                  onVenueNameChange(e.target.value);
                  searchVenues(e.target.value);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px]"
                placeholder="Search our directory or type your venue"
                aria-label="Venue name"
                autoFocus
                autoComplete="off"
              />
              {searchLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted animate-pulse">Searching...</span>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-[12px] shadow-lg overflow-hidden">
                {suggestions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVenue(v)}
                    className="w-full text-left px-4 py-3 hover:bg-lavender transition border-b border-border last:border-b-0"
                  >
                    <span className="text-[15px] font-medium text-plum">{v.name}</span>
                    <span className="block text-[12px] text-muted">{v.city}, {v.state}</span>
                  </button>
                ))}
                <div className="px-4 py-2 bg-lavender/30">
                  <p className="text-[11px] text-muted">Don&apos;t see it? Just type your venue name above.</p>
                </div>
              </div>
            )}
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
        className="btn-primary mt-6 w-full disabled:opacity-70 flex items-center justify-center gap-2"
      >
        {submitting && (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
          />
        )}
        {submitting ? "Setting up your wedding..." : "Go to my dashboard"}
      </button>
    </div>
  );
}

// Screen 7 — Invite Partner (optional, just collects email — invite sent after onboarding completes)
function InvitePartnerStep({ email, onEmailChange, onNext, onSkip }: { email: string; onEmailChange: (_v: string) => void; onNext: () => void; onSkip: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-[24px] sm:text-[28px] font-semibold text-plum">
        Invite your partner
      </h1>
      <p className="mt-2 text-[15px] text-muted leading-relaxed">
        Planning is better together. Your partner will get full access to view, edit, and manage your wedding.
      </p>
      <div className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Partner's email address"
          className="w-full rounded-[10px] border-border px-4 py-3.5 text-[16px] text-center"
          autoFocus
        />
        <button
          onClick={onNext}
          disabled={!email.trim()}
          className="btn-primary w-full disabled:opacity-50"
        >
          Continue
        </button>
        <p className="text-[13px] text-muted">
          We&apos;ll send the invitation once your wedding is set up.
        </p>
      </div>
      <button
        onClick={onSkip}
        className="mt-4 text-[13px] text-muted hover:text-plum transition"
      >
        Skip — I&apos;ll do this later
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
// 6: Invite Partner
// 7: AI (intro + greeting + input)

const TOTAL_STEPS = 8;
const PROGRESS_STEPS = TOTAL_STEPS - 1; // exclude Welcome

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReview = searchParams.get("review") === "true";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
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

        // Send partner invite now that the wedding exists
        if (form.partner_invite_email.trim()) {
          fetch("/api/collaborators", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.partner_invite_email.trim(), role: "partner" }),
          }).catch(() => {});
        }

        if (aiInput.trim()) {
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: aiInput.trim() }),
          }).catch(() => {});
        }
        setShowSnapshot(true);
        // Fire confetti just after the screen mounts so it overlays the celebration
        setTimeout(() => triggerConfetti(), 200);
      } else {
        toast.error("Setup didn't save. Try once more — if it keeps happening, reach out to support@eydn.app.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Wedding Snapshot — the first emotional moment ─────────────────────────
  if (showSnapshot) {
    const p1 = form.partner1_name || "You";
    const p2 = form.partner2_name;
    const coupleNames = p2 ? `${p1} & ${p2}` : p1;

    const dateStr = form.date
      ? new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;

    const details: string[] = [];
    if (form.venue_name) details.push(form.venue_name);
    if (form.venue_city) details.push(form.venue_city);
    if (form.guest_count_estimate) details.push(`~${Number(form.guest_count_estimate).toLocaleString()} guests`);
    if (form.budget) details.push(`$${Number(form.budget).toLocaleString()} budget`);

    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center px-6 overflow-hidden">
        {/* Soft bouquet backdrop with deep-forest tint to keep type readable */}
        <Image
          src={CELEBRATION_PHOTO.url}
          alt={CELEBRATION_PHOTO.alt}
          fill
          priority
          unoptimized
          className="object-cover"
          sizes="100vw"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(44,62,45,0.86) 0%, rgba(44,62,45,0.92) 60%, rgba(20,30,21,0.95) 100%)",
          }}
        />
        <Confetti />
        <div className="relative max-w-lg text-center">
          <p
            className="text-[14px] tracking-widest uppercase"
            style={{ color: "rgba(201, 168, 76, 0.7)" }}
          >
            Your wedding
          </p>
          <h1
            className="mt-4 leading-tight"
            style={{
              color: "#FAF6F1",
              fontSize: "clamp(2.5rem, 7vw, 3.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            {coupleNames}
          </h1>
          {dateStr && (
            <p className="mt-4 text-[20px]" style={{ color: "rgba(250, 246, 241, 0.85)" }}>
              {dateStr}
            </p>
          )}
          {details.length > 0 && (
            <p
              className="mt-2 text-[15px]"
              style={{ color: "rgba(250, 246, 241, 0.6)" }}
            >
              {details.join(" \u00B7 ")}
            </p>
          )}
          <div className="mt-10 mx-auto w-16 h-px" style={{ background: "rgba(201, 168, 76, 0.4)" }} />
          <p
            className="mt-10 text-[18px] leading-relaxed max-w-md mx-auto italic"
            style={{ color: "rgba(250, 246, 241, 0.8)" }}
          >
            Let&rsquo;s build something beautiful.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-10 inline-block rounded-full px-10 py-4 text-[15px] font-semibold transition"
            style={{ color: "#2C3E2D", background: "#FAF6F1" }}
          >
            Start Planning
          </button>
        </div>
        <p
          className="absolute bottom-3 right-4 text-[10px]"
          style={{ color: "rgba(250, 246, 241, 0.4)" }}
        >
          Photo by{" "}
          <a
            href={CELEBRATION_PHOTO.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {CELEBRATION_PHOTO.photographer}
          </a>{" "}
          on{" "}
          <a
            href={CELEBRATION_PHOTO.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Unsplash
          </a>
        </p>
      </div>
    );
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

  // Screen 8 — AI screen (no back button, no standard nav)
  if (step === 7) {
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
      {step === 6 && (
        <InvitePartnerStep
          email={form.partner_invite_email}
          onEmailChange={(v) => update("partner_invite_email", v)}
          onNext={() => setStep(7)}
          onSkip={() => setStep(7)}
        />
      )}

      {/* Navigation (hidden for invite step which has its own buttons) */}
      {step !== 6 && (
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
      )}
    </div>
  );
}
