"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type VendorAccount = {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  email: string;
  city: string | null;
  state: string | null;
  status: string;
  is_preferred: boolean;
  vendor_placements: {
    id: string;
    status: string;
    billing_period: string;
    starts_at: string;
    placement_tiers: { name: string; price_monthly: number } | null;
  }[];
};

type Placement = {
  id: string;
  vendor_account_id: string;
  tier_id: string;
  status: string;
  billing_period: string;
  starts_at: string;
  expires_at: string;
  vendor_accounts: {
    id: string;
    business_name: string;
    category: string;
    city: string | null;
    state: string | null;
    email: string;
  } | null;
  placement_tiers: { name: string; price_monthly: number } | null;
};

type Tier = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_annual: number;
  features: string[];
  sort_order: number;
  active: boolean;
};

type Tab = "revenue" | "vendors" | "tiers";

export default function AdminPlacementsPage() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [vendors, setVendors] = useState<VendorAccount[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activePlacementsCount, setActivePlacementsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/vendor-accounts").then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return [];
        }
        return r.ok ? r.json() : [];
      }),
      fetch("/api/admin/placements").then((r) => (r.ok ? r.json() : { placements: [], total_monthly_revenue: 0, active_placements: 0 })),
      fetch("/api/admin/placement-tiers").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, p, t]) => {
        setVendors(v || []);
        setPlacements(p.placements || []);
        setTotalRevenue(p.total_monthly_revenue || 0);
        setActivePlacementsCount(p.active_placements || 0);
        setTiers(t || []);
      })
      .catch(() => toast.error("Failed to load placement data"))
      .finally(() => setLoading(false));
  }, []);

  async function updateVendorAccount(id: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/vendor-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVendors((v) => v.map((x) => (x.id === id ? { ...x, ...data } : x)));
      toast.success("Vendor updated");
    } catch {
      toast.error("Failed to update vendor");
    }
  }

  async function saveTier(tier: Partial<Tier> & { id?: string }) {
    const isNew = !tier.id;
    try {
      const res = await fetch("/api/admin/placement-tiers", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tier),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (isNew) {
        setTiers((t) => [...t, data]);
      } else {
        setTiers((t) => t.map((x) => (x.id === data.id ? data : x)));
      }
      toast.success(isNew ? "Tier created" : "Tier updated");
      return true;
    } catch {
      toast.error("Failed to save tier");
      return false;
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (forbidden) {
    return (
      <div className="max-w-lg">
        <h1>Access Denied</h1>
        <p className="mt-2 text-[15px] text-muted">You don&apos;t have admin access.</p>
      </div>
    );
  }

  const tabs: Tab[] = ["revenue", "vendors", "tiers"];

  return (
    <div>
      <h1>Placements & Revenue</h1>

      <div className="mt-4 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${
              tab === t
                ? "border-violet text-violet"
                : "border-transparent text-plum/60 hover:text-plum"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {tab === "revenue" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-6">
              <p className="text-[13px] text-muted">Monthly Recurring Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-plum">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="card p-6">
              <p className="text-[13px] text-muted">Active Placements</p>
              <p className="mt-1 text-2xl font-semibold text-plum">{activePlacementsCount}</p>
            </div>
            <div className="card p-6">
              <p className="text-[13px] text-muted">Total Vendor Accounts</p>
              <p className="mt-1 text-2xl font-semibold text-plum">{vendors.length}</p>
            </div>
          </div>

          <h2 className="text-[15px] font-semibold text-plum">Revenue by Tier</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.filter((t) => t.active).map((tier) => {
              const count = placements.filter(
                (p) => p.placement_tiers?.name === tier.name && p.status === "active"
              ).length;
              return (
                <div key={tier.id} className="card p-6">
                  <p className="text-[15px] font-semibold text-violet">{tier.name}</p>
                  <p className="text-[13px] text-muted mt-1">{count} active subscriptions</p>
                  <p className="mt-2 text-xl font-semibold text-plum">
                    ${(count * tier.price_monthly).toLocaleString()}/mo
                  </p>
                </div>
              );
            })}
          </div>

          <h2 className="text-[15px] font-semibold text-plum">Recent Placements</h2>
          {placements.length === 0 ? (
            <p className="text-[15px] text-muted py-4 text-center">No placements yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-[16px] border border-border bg-white">
              <table className="w-full text-[15px]">
                <thead className="border-b border-border bg-lavender">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Vendor</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Tier</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Billing</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-semibold text-plum">
                        {p.vendor_accounts?.business_name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-muted">{p.placement_tiers?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <PlacementStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted">{p.billing_period}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(p.starts_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vendors Tab */}
      {tab === "vendors" && (
        <div className="mt-6">
          <p className="text-[15px] text-muted mb-4">
            {vendors.length} vendor {vendors.length === 1 ? "account" : "accounts"}
          </p>
          {vendors.length === 0 ? (
            <p className="text-[15px] text-muted py-8 text-center">No vendor accounts yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-[16px] border border-border bg-white">
              <table className="w-full text-[15px]">
                <thead className="border-b border-border bg-lavender">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Business</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Location</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Tier</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Preferred</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.map((v) => {
                    const active = v.vendor_placements?.find((p) => p.status === "active");
                    return (
                      <tr key={v.id}>
                        <td className="px-4 py-3 font-semibold text-plum">{v.business_name}</td>
                        <td className="px-4 py-3 text-muted">{v.category}</td>
                        <td className="px-4 py-3 text-muted">
                          {v.city && v.state ? `${v.city}, ${v.state}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <VendorStatusBadge status={v.status} />
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {active?.placement_tiers?.name || "None"}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={v.is_preferred}
                            onChange={() =>
                              updateVendorAccount(v.id, { is_preferred: !v.is_preferred })
                            }
                            className="accent-violet"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {v.status === "pending" && (
                              <button
                                onClick={() => updateVendorAccount(v.id, { status: "approved" })}
                                className="btn-primary btn-sm"
                              >
                                Approve
                              </button>
                            )}
                            {v.status === "approved" && (
                              <button
                                onClick={() => updateVendorAccount(v.id, { status: "suspended" })}
                                className="btn-destructive btn-sm"
                              >
                                Suspend
                              </button>
                            )}
                            {v.status === "suspended" && (
                              <button
                                onClick={() => updateVendorAccount(v.id, { status: "approved" })}
                                className="btn-secondary btn-sm"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tiers Tab */}
      {tab === "tiers" && (
        <TiersManager tiers={tiers} onSave={saveTier} />
      )}
    </div>
  );
}

/* ---------- Tiers Manager ---------- */

function TiersManager({
  tiers,
  onSave,
}: {
  tiers: Tier[];
  onSave: (_tier: Partial<Tier> & { id?: string }) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[15px] text-muted">{tiers.length} placement tiers</p>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
          Add Tier
        </button>
      </div>

      {showNew && (
        <TierForm
          onSave={async (t) => {
            const ok = await onSave(t);
            if (ok) setShowNew(false);
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      <div className="space-y-4">
        {tiers.map((tier) =>
          editingId === tier.id ? (
            <TierForm
              key={tier.id}
              initial={tier}
              onSave={async (t) => {
                const ok = await onSave({ ...t, id: tier.id });
                if (ok) setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={tier.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-violet">{tier.name}</h3>
                    {!tier.active && (
                      <span className="badge bg-red-100 text-red-700">Inactive</span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="text-[13px] text-muted mt-1">{tier.description}</p>
                  )}
                  <p className="text-xl font-semibold text-plum mt-2">
                    ${tier.price_monthly}/mo
                  </p>
                  {tier.features && tier.features.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {tier.features.map((f, i) => (
                        <li key={i} className="text-[13px] text-muted">&#10003; {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => setEditingId(tier.id)}
                  className="btn-ghost btn-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ---------- Tier Form ---------- */

function TierForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Tier;
  onSave: (_tier: Partial<Tier>) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [priceMonthly, setPriceMonthly] = useState(initial?.price_monthly?.toString() || "");
  const [priceQuarterly, setPriceQuarterly] = useState(initial?.price_quarterly?.toString() || "");
  const [priceAnnual, setPriceAnnual] = useState(initial?.price_annual?.toString() || "");
  const [featuresText, setFeaturesText] = useState(initial?.features?.join("\n") || "");
  const [active, setActive] = useState(initial?.active !== false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !priceMonthly) {
      toast.error("Name and monthly price are required");
      return;
    }
    const monthly = parseFloat(priceMonthly);
    setSaving(true);
    await onSave({
      name,
      description: description || null,
      price_monthly: monthly,
      price_quarterly: priceQuarterly ? parseFloat(priceQuarterly) : Math.round(monthly * 3 * 0.9),
      price_annual: priceAnnual ? parseFloat(priceAnnual) : Math.round(monthly * 12 * 0.8),
      features: featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
      active,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] text-muted">Tier Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            required
          />
        </div>
        <div>
          <label className="text-[13px] text-muted">Monthly Price ($) *</label>
          <input
            type="number"
            step="0.01"
            value={priceMonthly}
            onChange={(e) => setPriceMonthly(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] text-muted">Quarterly Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={priceQuarterly}
            onChange={(e) => setPriceQuarterly(e.target.value)}
            placeholder="Auto: monthly x 3 x 0.9"
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>
        <div>
          <label className="text-[13px] text-muted">Annual Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={priceAnnual}
            onChange={(e) => setPriceAnnual(e.target.value)}
            placeholder="Auto: monthly x 12 x 0.8"
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>
      </div>
      <div>
        <label className="text-[13px] text-muted">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        />
      </div>
      <div>
        <label className="text-[13px] text-muted">Features (one per line)</label>
        <textarea
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          placeholder="Priority placement in search&#10;Featured badge on listing&#10;Analytics dashboard"
        />
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={active}
          onChange={() => setActive(!active)}
          className="accent-violet"
        />
        <span className="text-[15px] text-plum">Active</span>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving..." : initial ? "Update Tier" : "Create Tier"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ---------- Status Badges ---------- */

function VendorStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    suspended: "bg-red-100 text-red-700",
  };
  return (
    <span className={`badge ${styles[status] || "bg-lavender text-muted"}`}>
      {status}
    </span>
  );
}

function PlacementStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    past_due: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`badge ${styles[status] || "bg-lavender text-muted"}`}>
      {status}
    </span>
  );
}
