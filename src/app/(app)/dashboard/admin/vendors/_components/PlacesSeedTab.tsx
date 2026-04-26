"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VENDOR_CATEGORIES } from "@/lib/vendors/categories";

type SeedConfig = {
  id: string;
  category: string;
  city: string;
  state: string;
  country: string;
  max_results: number;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_result_count: number | null;
  last_error: string | null;
};

type Usage = {
  capUnits: number;
  usedUnitsToday: number;
  remainingUnits: number;
  capHit: boolean;
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function PlacesSeedTab({ onVendorsImported }: { onVendorsImported: () => void }) {
  const [configs, setConfigs] = useState<SeedConfig[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: VENDOR_CATEGORIES[0] as string,
    city: "",
    state: "",
    max_results: 20,
  });

  function reload() {
    Promise.all([
      fetch("/api/admin/places-seed-configs").then((r) => (r.ok ? r.json() : { configs: [] })),
      fetch("/api/admin/places-usage").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([c, u]) => {
        setConfigs(c.configs || []);
        setUsage(u);
      })
      .catch(() => toast.error("Failed to load seed configs"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function addConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city.trim()) {
      toast.error("Enter a city");
      return;
    }
    if (!form.state) {
      toast.error("Pick a state");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/places-seed-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, city: form.city.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      toast.success("Seed config added");
      setForm({ category: VENDOR_CATEGORIES[0] as string, city: "", state: "", max_results: 20 });
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add config";
      console.error("[PlacesSeed] addConfig:", msg);
      toast.error(`Failed to add config: ${msg}`);
    } finally {
      setAdding(false);
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    setConfigs((cs) => cs.map((c) => (c.id === id ? { ...c, enabled } : c)));
    try {
      const res = await fetch(`/api/admin/places-seed-configs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setConfigs((cs) => cs.map((c) => (c.id === id ? { ...c, enabled: !enabled } : c)));
      toast.error("Failed to toggle");
    }
  }

  async function deleteConfig(id: string) {
    if (!confirm("Delete this seed config? This stops future runs but keeps previously-seeded vendors.")) return;
    const prev = configs;
    setConfigs((cs) => cs.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/admin/places-seed-configs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed");
    } catch {
      setConfigs(prev);
      toast.error("Failed to delete");
    }
  }

  async function runNow(id: string) {
    setRunning(id);
    try {
      const res = await fetch(`/api/admin/places-seed-configs/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Run failed");
      const summary = `Fetched ${data.fetched}, +${data.inserted} new, ${data.updated} refreshed${data.capHit ? " (daily cap reached)" : ""}`;
      toast.success(summary);
      if (data.inserted > 0 || data.updated > 0) onVendorsImported();
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(null);
    }
  }

  if (loading) return <p className="text-[15px] text-muted py-8">Loading…</p>;

  return (
    <div className="mt-4 space-y-6">
      {/* Cost cap indicator */}
      {usage && (
        <div className={`card p-4 flex items-center justify-between ${usage.capHit ? "bg-declined-bg" : ""}`}>
          <div>
            <p className="text-[13px] text-muted">Today&rsquo;s Places API spend</p>
            <p className="text-[18px] font-semibold text-plum">
              {usage.usedUnitsToday} / {usage.capUnits} cost units
            </p>
          </div>
          <p className="text-[12px] text-muted text-right">
            {usage.capHit
              ? "Cap reached — runs blocked until midnight UTC"
              : `${usage.remainingUnits} units remaining today`}
            <br />
            Adjust via <code>PLACES_API_DAILY_CAP</code> env var.
          </p>
        </div>
      )}

      {/* Add config form */}
      <form onSubmit={addConfig} className="card p-4 grid gap-3 sm:grid-cols-5">
        <div>
          <label className="block text-[13px] font-medium text-muted mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full"
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-muted mb-1">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Austin"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-muted mb-1">State</label>
          <select
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className="w-full"
          >
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-muted mb-1">Max results</label>
          <input
            type="number"
            min="1"
            max="60"
            value={form.max_results}
            onChange={(e) => setForm((f) => ({ ...f, max_results: Number(e.target.value) }))}
            className="w-full"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={adding} className="btn-primary w-full">
            {adding ? "Adding…" : "Add config"}
          </button>
        </div>
      </form>

      {/* Configs table */}
      {configs.length === 0 ? (
        <p className="text-[15px] text-muted text-center py-8">
          No seed configs yet. Add one above to start pulling vendors from Google Places.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead className="bg-lavender border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">City</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">State</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Max</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Last run</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Next run</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Last result</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {configs.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-semibold text-plum">{c.category}</td>
                  <td className="px-4 py-3">{c.city}</td>
                  <td className="px-4 py-3">{c.state}</td>
                  <td className="px-4 py-3">{c.max_results}</td>
                  <td className="px-4 py-3 text-muted text-[12px]">
                    {c.last_run_at ? new Date(c.last_run_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-[12px]">
                    {c.next_run_at ? new Date(c.next_run_at).toLocaleDateString() : "due"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.last_result_count !== null ? `${c.last_result_count} found` : "—"}
                    {c.last_error && (
                      <span className="block text-[11px] text-declined-text" title={c.last_error}>
                        error: {c.last_error.slice(0, 40)}…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        onChange={(e) => toggleEnabled(c.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className={c.enabled ? "text-confirmed-text text-[12px]" : "text-muted text-[12px]"}>
                        {c.enabled ? "on" : "off"}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => runNow(c.id)}
                      disabled={running === c.id || (usage?.capHit ?? false)}
                      className="btn-secondary btn-sm mr-1"
                      title={usage?.capHit ? "Daily cap reached" : "Run this config now"}
                    >
                      {running === c.id ? "Running…" : "Run now"}
                    </button>
                    <button onClick={() => deleteConfig(c.id)} className="btn-destructive btn-sm">Del</button>
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
