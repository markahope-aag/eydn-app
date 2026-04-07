"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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

  // Parse URL params for initial state
  const initial = (() => {
    if (typeof window === "undefined") return { budget: 25000, guests: 120, state: "Wisconsin", month: 8 };
    const b = searchParams.get("budget");
    const g = searchParams.get("guests");
    const s = searchParams.get("state");
    const m = searchParams.get("month");
    const allFlat = Object.values(STATES).flat();
    return {
      budget: b ? Math.min(75000, Math.max(5000, Number(b))) : 25000,
      guests: g ? Math.min(300, Math.max(10, Number(g))) : 120,
      state: s && allFlat.find((st) => st.label === s) ? s : "Wisconsin",
      month: m ? Math.min(11, Math.max(0, Number(m))) : 8,
    };
  })();

  const [budget, setBudget] = useState(initial.budget);
  const [guests, setGuests] = useState(initial.guests);
  const [stateKey, setStateKey] = useState(initial.state);
  const [monthIdx, setMonthIdx] = useState(initial.month);

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
    const params = new URLSearchParams({
      budget: String(budget),
      guests: String(guests),
      state: stateKey,
      month: String(monthIdx),
    });
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

      {/* Share row */}
      <div className="mt-6 pt-5 border-t border-border flex flex-wrap justify-between items-center gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(getShareUrl())}
          className="text-[12px] text-muted hover:text-violet transition"
        >
          Copy shareable link &rarr;
        </button>
        <p className="text-[11px] text-muted/60">
          Based on The Knot 2026 Real Weddings Study &middot; Zola 2026 Wedding Spend Survey
        </p>
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
    </div>
  );
}
