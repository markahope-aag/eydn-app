"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Lead = {
  name: string | null;
  email: string;
  source: string;
  details: string | null;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  beta: "Beta Waitlist",
  waitlist: "Waitlist",
  calculator: "Budget Calculator",
};

function sourceLabel(source: string): string {
  // Handle multi-source like "newsletter, calculator"
  return source.split(", ").map((s) => SOURCE_LABELS[s.trim()] || s).join(", ");
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/leads")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLeads)
      .catch(() => toast.error("Failed to load leads"))
      .finally(() => setLoading(false));
  }, []);

  const allSources = [...new Set(leads.flatMap((l) => l.source.split(", ").map((s) => s.trim())))];

  const filtered = leads.filter((l) => {
    if (sourceFilter !== "all" && !l.source.includes(sourceFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.email.toLowerCase().includes(q) &&
        !(l.name || "").toLowerCase().includes(q) &&
        !(l.details || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  function exportCSV() {
    const rows = [["Name", "Email", "Source", "Details", "Date"]];
    for (const l of filtered) {
      rows.push([
        l.name || "",
        l.email,
        sourceLabel(l.source),
        l.details || "",
        new Date(l.created_at).toLocaleDateString(),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eydn-leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} leads`);
  }

  if (loading) {
    return (
      <div>
        <h1>Leads</h1>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-[10px] bg-lavender/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const newsletterCount = leads.filter((l) => l.source.includes("newsletter")).length;
  const calculatorCount = leads.filter((l) => l.source.includes("calculator")).length;
  const betaCount = leads.filter((l) => l.source.includes("beta") || l.source.includes("waitlist")).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1>Leads</h1>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="btn-secondary btn-sm disabled:opacity-50">
          Export CSV ({filtered.length})
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-[13px] text-muted">Total Leads</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{leads.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Newsletter</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{newsletterCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Budget Calculator</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{calculatorCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Beta / Waitlist</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{betaCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-white pl-10 pr-3 py-1.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-[10px] border border-border px-3 py-1.5 text-[15px]"
        >
          <option value="all">All sources ({leads.length})</option>
          {allSources.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s] || s} ({leads.filter((l) => l.source.includes(s)).length})</option>
          ))}
        </select>
        <span className="text-[13px] text-muted">{filtered.length} shown</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-[15px] text-muted py-8 text-center">
          {leads.length === 0 ? "No leads yet." : "No leads match your search."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[16px] border border-border bg-white">
          <table className="w-full text-[15px]">
            <thead className="border-b border-border bg-lavender">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Source</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Details</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((lead, i) => (
                <tr key={`${lead.email}-${i}`}>
                  <td className="px-4 py-3 font-semibold text-plum">
                    {lead.name || <span className="text-muted/50 italic">No name</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{lead.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {lead.source.split(", ").map((s) => (
                        <span key={s} className="badge badge-confirmed text-[11px]">
                          {SOURCE_LABELS[s.trim()] || s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted">{lead.details || "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(lead.created_at).toLocaleDateString()}
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
