"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

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

const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];

type VendorAccount = {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  email: string;
  city: string | null;
  state: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  price_range: string | null;
  status: string;
  is_preferred: boolean;
  created_at: string;
};

type Tier = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_annual: number;
  features: string[];
  active: boolean;
};

type Placement = {
  id: string;
  tier_id: string;
  status: string;
  billing_period: string;
  starts_at: string;
  expires_at: string;
  auto_renew: boolean;
  placement_tiers: Tier;
};

type Analytics = {
  impressions: number;
  clicks: number;
  leads: number;
};

type Tab = "overview" | "profile" | "placement" | "analytics";

export default function VendorPortalPage() {
  const [account, setAccount] = useState<VendorAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    fetch("/api/vendor-portal/account")
      .then((r) => {
        if (r.status === 404) {
          setHasAccount(false);
          return null;
        }
        if (r.ok) {
          setHasAccount(true);
          return r.json();
        }
        return null;
      })
      .then((data) => {
        if (data) setAccount(data);
      })
      .catch(() => toast.error("Couldn't load your vendor account. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (!hasAccount) {
    return <RegistrationForm onSuccess={(a) => { setAccount(a); setHasAccount(true); }} />;
  }

  return <VendorDashboard account={account!} setAccount={setAccount} />;
}

/* ---------- Registration Form ---------- */

function RegistrationForm({ onSuccess }: { onSuccess: (_a: VendorAccount) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    category: VENDOR_CATEGORIES[0],
    email: "",
    city: "",
    state: "",
    description: "",
    website: "",
    phone: "",
    price_range: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name || !form.email) {
      toast.error("Business name and email are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor-portal/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Account didn't save. Try again.");
      }
      const data = await res.json();
      toast.success("Account created. Your application is under review.");
      onSuccess(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Account didn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1>Become an Eydn Vendor</h1>
      <p className="mt-2 text-[15px] text-muted">
        Join the Eydn vendor network to get featured to couples planning their weddings.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-[13px] text-muted">Business Name *</label>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            required
          />
        </div>

        <div>
          <label className="text-[13px] text-muted">Category *</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[13px] text-muted">Business Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] text-muted">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[13px] text-muted">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            />
          </div>
        </div>

        <div>
          <label className="text-[13px] text-muted">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>

        <div>
          <label className="text-[13px] text-muted">Website</label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            placeholder="https://"
          />
        </div>

        <div>
          <label className="text-[13px] text-muted">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>

        <div>
          <label className="text-[13px] text-muted">Price Range</label>
          <select
            value={form.price_range}
            onChange={(e) => update("price_range", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          >
            <option value="">Select...</option>
            {PRICE_RANGES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Submitting..." : "Apply as Vendor"}
        </button>
      </form>
    </div>
  );
}

/* ---------- Vendor Dashboard ---------- */

function VendorDashboard({
  account,
  setAccount,
}: {
  account: VendorAccount;
  setAccount: (_a: VendorAccount) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ impressions: 0, clicks: 0, leads: 0 });

  useEffect(() => {
    fetch("/api/vendor-portal/tiers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTiers)
      .catch((err) => console.error("Failed to load vendor tiers", err));

    fetch("/api/vendor-portal/placements")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlacements)
      .catch((err) => console.error("Failed to load vendor placements", err));

    fetch("/api/vendor-portal/analytics")
      .then((r) => (r.ok ? r.json() : { impressions: 0, clicks: 0, leads: 0 }))
      .then(setAnalytics)
      .catch((err) => console.error("Failed to load vendor analytics", err));
  }, []);

  const activePlacement = placements.find((p) => p.status === "active");

  const tabs: Tab[] = ["overview", "profile", "placement", "analytics"];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Vendor Portal</h1>
        <StatusBadge status={account.status} />
      </div>

      {/* Tabs */}
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

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="card p-6">
            <h2 className="text-[15px] font-semibold text-plum">{account.business_name}</h2>
            <p className="text-[13px] text-muted mt-1">{account.category}</p>
            {account.city && account.state && (
              <p className="text-[13px] text-muted">{account.city}, {account.state}</p>
            )}
          </div>

          {activePlacement && (
            <div className="card p-6">
              <p className="text-[13px] text-muted">Current Placement</p>
              <p className="mt-1 text-[15px] font-semibold text-violet">
                {activePlacement.placement_tiers?.name || "Active"}
              </p>
              <p className="text-[12px] text-muted mt-1">
                Since {new Date(activePlacement.starts_at).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-6">
              <p className="text-[13px] text-muted">Impressions (30d)</p>
              <p className="mt-1 text-2xl font-semibold text-plum">{analytics.impressions}</p>
            </div>
            <div className="card p-6">
              <p className="text-[13px] text-muted">Clicks (30d)</p>
              <p className="mt-1 text-2xl font-semibold text-plum">{analytics.clicks}</p>
            </div>
            <div className="card p-6">
              <p className="text-[13px] text-muted">Leads (30d)</p>
              <p className="mt-1 text-2xl font-semibold text-plum">{analytics.leads}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === "profile" && (
        <ProfileEditor account={account} onUpdate={setAccount} />
      )}

      {/* Placement Tab */}
      {tab === "placement" && (
        <PlacementTab
          account={account}
          tiers={tiers}
          activePlacement={activePlacement || null}
        />
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <div className="mt-6 space-y-6">
          <h2 className="text-[15px] font-semibold text-plum">Performance (Last 30 Days)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-6">
              <p className="text-[13px] text-muted">Impressions</p>
              <p className="mt-1 text-2xl sm:text-3xl font-semibold text-plum">{analytics.impressions}</p>
              <p className="text-[12px] text-muted mt-1">Times your listing was shown</p>
            </div>
            <div className="card p-6">
              <p className="text-[13px] text-muted">Clicks</p>
              <p className="mt-1 text-2xl sm:text-3xl font-semibold text-plum">{analytics.clicks}</p>
              <p className="text-[12px] text-muted mt-1">Times couples clicked your listing</p>
            </div>
            <div className="card p-6">
              <p className="text-[13px] text-muted">Leads</p>
              <p className="mt-1 text-2xl sm:text-3xl font-semibold text-plum">{analytics.leads}</p>
              <p className="text-[12px] text-muted mt-1">Couples who contacted you</p>
            </div>
          </div>
          {analytics.clicks > 0 && (
            <div className="card p-6">
              <p className="text-[13px] text-muted">Click-through Rate</p>
              <p className="mt-1 text-2xl font-semibold text-violet">
                {analytics.impressions > 0
                  ? ((analytics.clicks / analytics.impressions) * 100).toFixed(1)
                  : "0"}
                %
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Profile Editor ---------- */

function ProfileEditor({
  account,
  onUpdate,
}: {
  account: VendorAccount;
  onUpdate: (_a: VendorAccount) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: account.business_name,
    category: account.category,
    email: account.email,
    city: account.city || "",
    state: account.state || "",
    description: account.description || "",
    website: account.website || "",
    phone: account.phone || "",
    price_range: account.price_range || "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vendor-portal/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdate(data);
      toast.success("Profile updated");
    } catch {
      toast.error("Profile didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-6 max-w-lg space-y-4">
      <div>
        <label className="text-[13px] text-muted">Business Name</label>
        <input
          type="text"
          value={form.business_name}
          onChange={(e) => update("business_name", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        />
      </div>
      <div>
        <label className="text-[13px] text-muted">Category</label>
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        >
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[13px] text-muted">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] text-muted">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>
        <div>
          <label className="text-[13px] text-muted">State</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>
      </div>
      <div>
        <label className="text-[13px] text-muted">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        />
      </div>
      <div>
        <label className="text-[13px] text-muted">Website</label>
        <input
          type="url"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          placeholder="https://"
        />
      </div>
      <div>
        <label className="text-[13px] text-muted">Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        />
      </div>
      <div>
        <label className="text-[13px] text-muted">Price Range</label>
        <select
          value={form.price_range}
          onChange={(e) => update("price_range", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        >
          <option value="">Select...</option>
          {PRICE_RANGES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}

/* ---------- Placement Tab ---------- */

function PlacementTab({
  account,
  tiers,
  activePlacement,
}: {
  account: VendorAccount;
  tiers: Tier[];
  activePlacement: Placement | null;
}) {
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  async function handlePurchase(tierId: string, billingPeriod: string) {
    if (account.status !== "approved") {
      toast.error("Your account needs to be approved first.");
      return;
    }

    setCheckingOut(tierId);
    try {
      const res = await fetch("/api/vendor-portal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, billing_period: billingPeriod }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Couldn't start checkout. Try again.");
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout didn't go through. Try again.");
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {activePlacement && (
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-plum">Current Placement</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="badge bg-lavender text-violet">
              {activePlacement.placement_tiers?.name}
            </span>
            <span className="text-[13px] text-muted">
              {activePlacement.billing_period} billing
            </span>
          </div>
          <p className="text-[12px] text-muted mt-2">
            Active since {new Date(activePlacement.starts_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {account.status !== "approved" && (
        <div className="card p-6 border-l-4 border-l-amber-400">
          <p className="text-[15px] text-plum font-semibold">Account Pending Approval</p>
          <p className="text-[13px] text-muted mt-1">
            Your vendor account needs to be approved before you can purchase a placement tier.
          </p>
        </div>
      )}

      <h2 className="text-[15px] font-semibold text-plum">Available Placement Tiers</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div key={tier.id} className="card p-6 flex flex-col">
            <h3 className="text-[15px] font-semibold text-violet">{tier.name}</h3>
            {tier.description && (
              <p className="text-[13px] text-muted mt-1">{tier.description}</p>
            )}
            <p className="mt-3 text-2xl font-semibold text-plum">
              ${tier.price_monthly}
              <span className="text-[13px] font-normal text-muted">/mo</span>
            </p>

            {tier.features && tier.features.length > 0 && (
              <ul className="mt-3 space-y-1.5 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="text-[13px] text-muted flex items-start gap-2">
                    <span className="text-violet mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-2">
              {activePlacement?.placement_tiers?.name === tier.name ? (
                <span className="badge bg-lavender text-violet">Current Plan</span>
              ) : (
                <>
                  <button
                    onClick={() => handlePurchase(tier.id, "monthly")}
                    disabled={checkingOut === tier.id || account.status !== "approved"}
                    className="btn-primary btn-sm w-full"
                  >
                    {checkingOut === tier.id ? "Redirecting..." : activePlacement ? "Upgrade - Monthly" : "Purchase - Monthly"}
                  </button>
                  <button
                    onClick={() => handlePurchase(tier.id, "quarterly")}
                    disabled={checkingOut === tier.id || account.status !== "approved"}
                    className="btn-secondary btn-sm w-full"
                  >
                    Quarterly - ${tier.price_quarterly}
                  </button>
                  <button
                    onClick={() => handlePurchase(tier.id, "annual")}
                    disabled={checkingOut === tier.id || account.status !== "approved"}
                    className="btn-ghost btn-sm w-full"
                  >
                    Annual - ${tier.price_annual}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <p className="text-[15px] text-muted py-4 text-center">
          No placement tiers are currently available.
        </p>
      )}
    </div>
  );
}

/* ---------- Status Badge ---------- */

function StatusBadge({ status }: { status: string }) {
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
