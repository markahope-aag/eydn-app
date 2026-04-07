"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import BudgetBreakdownBar from "./BudgetBreakdownBar";
import SummaryCard from "./SummaryCard";

// ─── Data ────────────────────────────────────────────────────────────────────

const BUDGET_CATEGORIES = [
  { name: "Venue", pct: 0.238, color: "#2C3E2D" },
  { name: "Catering & bar", pct: 0.192, color: "#C08080" },
  { name: "Photography & video", pct: 0.12, color: "#C9A84C" },
  { name: "Florals & decor", pct: 0.09, color: "#D4A5A5" },
  { name: "Attire & beauty", pct: 0.065, color: "#6B5E50" },
  { name: "Music & entertainment", pct: 0.06, color: "#3A5240" },
  { name: "Rehearsal dinner", pct: 0.04, color: "#8B6D14" },
  { name: "Stationery & gifts", pct: 0.025, color: "#A08070" },
  { name: "Transportation", pct: 0.02, color: "#4A6A4E" },
  { name: "Ceremony & officiant", pct: 0.015, color: "#2A2018" },
] as const;

interface StateOption {
  label: string;
  mult: number;
  avg: number;
}

const STATES: Record<string, StateOption[]> = {
  Northeast: [
    { label: "New York", mult: 1.45, avg: 47000 },
    { label: "New Jersey", mult: 1.5, avg: 54400 },
    { label: "Massachusetts", mult: 1.35, avg: 42000 },
    { label: "Connecticut", mult: 1.3, avg: 38000 },
    { label: "Rhode Island", mult: 1.2, avg: 35000 },
  ],
  "Mid-Atlantic": [
    { label: "Maryland", mult: 1.2, avg: 38000 },
    { label: "Virginia", mult: 1.15, avg: 35000 },
    { label: "Pennsylvania", mult: 1.1, avg: 32000 },
    { label: "Delaware", mult: 1.05, avg: 30000 },
  ],
  Southeast: [
    { label: "Florida", mult: 1.0, avg: 31000 },
    { label: "Georgia", mult: 0.9, avg: 27500 },
    { label: "North Carolina", mult: 0.9, avg: 27000 },
    { label: "South Carolina", mult: 0.85, avg: 25000 },
    { label: "Tennessee", mult: 0.85, avg: 25500 },
  ],
  Midwest: [
    { label: "Illinois", mult: 0.95, avg: 30000 },
    { label: "Ohio", mult: 0.88, avg: 26500 },
    { label: "Michigan", mult: 0.88, avg: 26000 },
    { label: "Minnesota", mult: 0.85, avg: 26000 },
    { label: "Wisconsin", mult: 0.82, avg: 24500 },
    { label: "Indiana", mult: 0.8, avg: 24000 },
    { label: "Iowa", mult: 0.8, avg: 23500 },
    { label: "Missouri", mult: 0.85, avg: 25000 },
  ],
  South: [
    { label: "Texas", mult: 0.9, avg: 28000 },
    { label: "Louisiana", mult: 0.8, avg: 24000 },
    { label: "Mississippi", mult: 0.75, avg: 19000 },
    { label: "Alabama", mult: 0.78, avg: 22000 },
    { label: "Arkansas", mult: 0.78, avg: 22500 },
    { label: "Oklahoma", mult: 0.78, avg: 23000 },
  ],
  Mountain: [
    { label: "Colorado", mult: 0.95, avg: 29000 },
    { label: "Arizona", mult: 0.85, avg: 26000 },
    { label: "Nevada", mult: 0.82, avg: 25000 },
    { label: "Utah", mult: 0.75, avg: 19500 },
    { label: "New Mexico", mult: 0.8, avg: 23000 },
    { label: "Idaho", mult: 0.78, avg: 22000 },
    { label: "Wyoming", mult: 0.75, avg: 21000 },
    { label: "Montana", mult: 0.72, avg: 20500 },
  ],
  Pacific: [
    { label: "California", mult: 1.4, avg: 44000 },
    { label: "Washington", mult: 1.2, avg: 36000 },
    { label: "Oregon", mult: 1.1, avg: 32000 },
    { label: "Hawaii", mult: 1.55, avg: 49000 },
    { label: "Alaska", mult: 0.6, avg: 16200 },
  ],
  Plains: [
    { label: "Kansas", mult: 0.78, avg: 22000 },
    { label: "Nebraska", mult: 0.72, avg: 21000 },
    { label: "South Dakota", mult: 0.7, avg: 20000 },
    { label: "North Dakota", mult: 0.7, avg: 19500 },
  ],
  Other: [
    { label: "Washington D.C.", mult: 1.4, avg: 45000 },
  ],
};

interface MonthOption {
  label: string;
  mult: number;
  tag: string;
}

const MONTHS: MonthOption[] = [
  { label: "January", mult: 0.9, tag: "off-season" },
  { label: "February", mult: 0.9, tag: "off-season" },
  { label: "March", mult: 0.92, tag: "off-season" },
  { label: "April", mult: 0.95, tag: "shoulder" },
  { label: "May", mult: 1.0, tag: "shoulder" },
  { label: "June", mult: 1.1, tag: "peak" },
  { label: "July", mult: 1.1, tag: "peak" },
  { label: "August", mult: 1.1, tag: "peak" },
  { label: "September", mult: 1.1, tag: "peak" },
  { label: "October", mult: 1.08, tag: "peak" },
  { label: "November", mult: 0.92, tag: "shoulder" },
  { label: "December", mult: 0.88, tag: "off-season" },
];

const HIDDEN_COST_BUFFER = 0.09;

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function formatShort(n: number): string {
  if (n >= 1000) return "$" + Math.round(n / 1000) + "K";
  return "$" + Math.round(n);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WeddingBudgetCalculator() {
  const searchParams = useSearchParams();

  // Parse URL params for initial values
  const allFlat = Object.values(STATES).flat();
  const bParam = searchParams.get("budget");
  const gParam = searchParams.get("guests");
  const sParam = searchParams.get("state");
  const mParam = searchParams.get("month");

  const [budget, setBudget] = useState(() => bParam ? Math.min(75000, Math.max(5000, Number(bParam))) : 25000);
  const [guests, setGuests] = useState(() => gParam ? Math.min(300, Math.max(10, Number(gParam))) : 120);
  const [stateKey, setStateKey] = useState(() => sParam && allFlat.find((st) => st.label === sParam) ? sParam : "Wisconsin");
  const [monthIdx, setMonthIdx] = useState(() => mParam ? Math.min(11, Math.max(0, Number(mParam))) : 8);

  // Save modal state
  const [showSave, setShowSave] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);

  async function handleSave() {
    if (!saveEmail.trim() || !saveEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tools/calculator-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: saveEmail.trim(), budget, guests, state: stateKey, month: monthIdx }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSavedCode(data.short_code);
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // Keep URL in sync so bookmarking/sharing always works
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({ budget: String(budget), guests: String(guests), state: stateKey, month: String(monthIdx) });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [budget, guests, stateKey, monthIdx]);

  const allStates = Object.values(STATES).flat();
  const selectedState = allStates.find((s) => s.label === stateKey) ?? allStates[0];
  const selectedMonth = MONTHS[monthIdx];

  const perGuest = Math.round(budget / guests);
  const stateAvg = selectedState.avg;
  const diff = budget - stateAvg;

  const plannedBudget = budget * (1 - HIDDEN_COST_BUFFER);
  const hiddenCostAmt = Math.round(budget * HIDDEN_COST_BUFFER);
  const maxCatAmt = BUDGET_CATEGORIES[0].pct * plannedBudget;

  const vsAvgLabel = (() => {
    if (Math.abs(diff) < 1500) return { text: "On par", cls: "text-plum" };
    if (diff > 0) return { text: "+" + formatCurrency(diff), cls: "text-amber-600" };
    return { text: formatCurrency(diff), cls: "text-emerald-600" };
  })();

  const getShareUrl = useCallback(() => {
    if (typeof window !== "undefined") return window.location.href;
    const params = new URLSearchParams({ budget: String(budget), guests: String(guests), state: stateKey, month: String(monthIdx) });
    return `https://eydn.app/tools/wedding-budget-calculator?${params.toString()}`;
  }, [budget, guests, stateKey, monthIdx]);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Inputs */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-5">
            Your wedding details
          </p>

          {/* Budget slider */}
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-[13px] text-muted">Total budget</label>
              <span className="text-[16px] font-semibold text-plum">{formatCurrency(budget)}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={75000}
              step={500}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[#C08080]"
              aria-label="Total wedding budget"
            />
            <div className="flex justify-between text-[11px] text-muted/50 mt-1">
              <span>$5K</span>
              <span>$75K</span>
            </div>
          </div>

          {/* Guest count slider */}
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-[13px] text-muted">Guest count</label>
              <span className="text-[16px] font-semibold text-plum">{guests} guests</span>
            </div>
            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full accent-[#C08080]"
              aria-label="Number of wedding guests"
            />
            <div className="flex justify-between text-[11px] text-muted/50 mt-1">
              <span>10</span>
              <span>300</span>
            </div>
          </div>

          {/* State */}
          <div className="mb-5">
            <label className="block text-[13px] text-muted mb-2">State</label>
            <select
              value={stateKey}
              onChange={(e) => setStateKey(e.target.value)}
              className="w-full text-[14px] border border-border rounded-[10px] px-3 py-2 text-plum bg-white focus:outline-none focus:ring-2 focus:ring-violet/30"
              aria-label="Wedding state"
            >
              {Object.entries(STATES).map(([region, states]) => (
                <optgroup key={region} label={region}>
                  {states.map((s) => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="mb-5">
            <label className="block text-[13px] text-muted mb-2">Wedding month</label>
            <select
              value={monthIdx}
              onChange={(e) => setMonthIdx(Number(e.target.value))}
              className="w-full text-[14px] border border-border rounded-[10px] px-3 py-2 text-plum bg-white focus:outline-none focus:ring-2 focus:ring-violet/30"
              aria-label="Wedding month"
            >
              {MONTHS.map((m, i) => (
                <option key={m.label} value={i}>{m.label} — {m.tag}</option>
              ))}
            </select>
          </div>

          {/* Season note */}
          {selectedMonth.tag === "peak" && (
            <p className="text-[12px] text-amber-700 bg-amber-50 rounded-[10px] px-3 py-2">
              Peak season months (June-October) typically run 8-10% higher than average vendor pricing.
            </p>
          )}
          {selectedMonth.tag === "off-season" && (
            <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-[10px] px-3 py-2">
              Off-season dates often unlock 10-15% discounts from venues and vendors.
            </p>
          )}
        </div>

        {/* Right: Results */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-5">
            Recommended breakdown
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryCard label="Per guest" value={formatCurrency(perGuest)} />
            <SummaryCard label={`${selectedState.label} avg`} value={formatShort(stateAvg)} />
            <SummaryCard label="vs. avg" value={vsAvgLabel.text} valueClassName={vsAvgLabel.cls} />
          </div>

          {/* Category breakdown */}
          <div className="space-y-3 mb-4">
            {BUDGET_CATEGORIES.map((cat) => {
              const amt = cat.pct * plannedBudget;
              const barPct = Math.round((amt / maxCatAmt) * 100);
              return (
                <BudgetBreakdownBar
                  key={cat.name}
                  name={cat.name}
                  amount={amt}
                  barPct={barPct}
                  color={cat.color}
                  formatCurrency={formatCurrency}
                />
              );
            })}
          </div>

          {/* Hidden cost note */}
          <div className="bg-lavender/30 rounded-xl px-4 py-3 text-[12px] text-muted leading-relaxed">
            <span className="font-semibold text-plum">
              Reserve {formatCurrency(hiddenCostAmt)} (9%) for hidden costs
            </span>{" "}
            — service charges, gratuities, overtime fees, and day-of extras.
            74% of couples spend more than originally budgeted.
          </div>
        </div>
      </div>

      {/* Save & share */}
      <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center gap-4">
        <button
          onClick={() => {
            const url = getShareUrl();
            navigator.clipboard.writeText(url).then(
              () => toast.success("Link copied — anyone with this URL sees your exact breakdown"),
              () => window.prompt("Copy this link:", url),
            );
          }}
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-violet hover:text-plum transition cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy shareable link
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-violet hover:text-plum transition cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Save as PDF
        </button>
        <button
          onClick={() => { setShowSave(true); setSavedCode(null); }}
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-violet hover:text-plum transition cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save my breakdown
        </button>
      </div>

      {/* CTA */}
      <div className="mt-4 bg-[#2C3E2D] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-[#FAF6F1] mb-1">
            Ready to track your real budget?
          </p>
          <p className="text-[12px] text-[#FAF6F1]/60 leading-relaxed">
            Eydn pre-loads 36 line items across 13 categories with real vendor quotes,
            deposits, payment dates, and an AI that takes action.
          </p>
        </div>
        <Link
          href="/sign-up"
          className="whitespace-nowrap text-[14px] font-semibold bg-[#D4A5A5] text-white rounded-full px-6 py-2.5 hover:bg-[#C08080] transition"
        >
          Start free — $79 one-time
        </Link>
      </div>

      {/* Save modal */}
      {showSave && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            {savedCode ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet/10 mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-plum">Saved</h3>
                <p className="mt-2 text-[14px] text-muted leading-relaxed">
                  Your breakdown is saved. Come back anytime with this link:
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 bg-lavender rounded-full px-4 py-2.5">
                  <span className="text-[13px] font-semibold text-plum truncate">
                    eydn.app/tools/wedding-budget-calculator/s/{savedCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://eydn.app/tools/wedding-budget-calculator/s/${savedCode}`);
                      toast.success("Link copied");
                    }}
                    className="flex-shrink-0 text-violet hover:text-plum transition cursor-pointer"
                    aria-label="Copy saved link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <p className="mt-4 text-[12px] text-muted">
                  We sent this link to <span className="font-semibold">{saveEmail}</span> too.
                </p>
                <button
                  onClick={() => setShowSave(false)}
                  className="mt-6 btn-secondary"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-[20px] font-semibold text-plum">Save your breakdown</h3>
                <p className="mt-2 text-[14px] text-muted leading-relaxed">
                  Enter your email and we&rsquo;ll give you a personal link to come back to your exact calculator settings anytime.
                </p>
                <input
                  type="email"
                  placeholder="Your email"
                  value={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  className="mt-4 w-full rounded-[10px] border border-border bg-white px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
                  autoFocus
                />
                <p className="mt-2 text-[11px] text-muted/60">
                  No spam, ever. Just your saved calculator link.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? "Saving..." : "Save & email my link"}
                  </button>
                  <button
                    onClick={() => setShowSave(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
