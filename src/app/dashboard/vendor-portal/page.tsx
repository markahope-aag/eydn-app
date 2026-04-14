"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

type Analytics = {
  impressions: number;
  clicks: number;
  leads: number;
};

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
    return (
      <RegistrationForm
        onSuccess={(a) => {
          setAccount(a);
          setHasAccount(true);
        }}
      />
    );
  }

  return <VendorProfile account={account!} setAccount={setAccount} />;
}

/* ───────────────────── Registration ───────────────────── */

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

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor-portal/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Couldn't submit your application");
      }
      const data = await res.json();
      onSuccess(data);
      toast.success("Application submitted. We'll review it shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-[36px] text-plum">Join the Eydn vendor directory</h1>
      <p className="mt-3 text-[15px] text-muted leading-relaxed">
        Free to join. We don&rsquo;t charge for placement, we don&rsquo;t sell your
        data, and we don&rsquo;t let money influence who shows up first. See{" "}
        <Link href="/pledge" className="text-violet hover:text-soft-violet underline">
          the Eydn Pledge
        </Link>{" "}
        for the whole commitment.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 card-summary p-6">
        <div>
          <label className="text-[13px] text-muted">Business Name *</label>
          <input
            type="text"
            required
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
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
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[13px] text-muted">Contact Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[13px] text-muted">City *</label>
            <input
              type="text"
              required
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[13px] text-muted">State *</label>
            <input
              type="text"
              required
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
              <option key={p} value={p}>
                {p}
              </option>
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

/* ───────────────────── Read-only profile ───────────────────── */

function VendorProfile({
  account,
  setAccount,
}: {
  account: VendorAccount;
  setAccount: (_a: VendorAccount) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({ impressions: 0, clicks: 0, leads: 0 });

  useEffect(() => {
    fetch("/api/vendor-portal/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAnalytics(data);
      })
      .catch(() => {});
  }, []);

  const statusLabel =
    account.status === "approved"
      ? "Approved — live in the directory"
      : account.status === "pending"
        ? "Pending review"
        : account.status === "rejected"
          ? "Not accepted"
          : account.status;

  const statusColor =
    account.status === "approved"
      ? "text-green-700 bg-green-50 border-green-200"
      : account.status === "rejected"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-[36px] text-plum">{account.business_name}</h1>
        <p className="mt-1 text-[14px] text-muted">{account.category}</p>
      </div>

      <div className={`card-summary p-5 border ${statusColor}`}>
        <div className="text-[12px] font-semibold uppercase tracking-wide">Status</div>
        <div className="mt-1 text-[15px]">{statusLabel}</div>
      </div>

      {editing ? (
        <EditForm
          account={account}
          onSave={(updated) => {
            setAccount(updated);
            setEditing(false);
            toast.success("Profile updated.");
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="card-summary p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-serif text-[22px] text-plum">Your profile</h2>
              <button
                onClick={() => setEditing(true)}
                className="text-[13px] text-violet hover:text-soft-violet font-semibold"
              >
                Edit
              </button>
            </div>
            <dl className="space-y-3 text-[14px]">
              <Row label="Contact email" value={account.email} />
              <Row
                label="Location"
                value={[account.city, account.state].filter(Boolean).join(", ") || "—"}
              />
              {account.phone && <Row label="Phone" value={account.phone} />}
              {account.website && (
                <Row
                  label="Website"
                  value={
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet hover:text-soft-violet underline"
                    >
                      {account.website}
                    </a>
                  }
                />
              )}
              {account.price_range && <Row label="Price range" value={account.price_range} />}
              {account.description && (
                <Row label="Description" value={account.description} />
              )}
            </dl>
          </div>

          <div className="card-summary p-6">
            <h2 className="font-serif text-[22px] text-plum mb-4">Directory activity</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="Impressions" value={analytics.impressions} />
              <Stat label="Profile clicks" value={analytics.clicks} />
              <Stat label="Leads" value={analytics.leads} />
            </div>
            <p className="mt-4 text-[12px] text-muted">
              Eydn never sells placement, shows sponsored results, or puts vendors who
              pay us above vendors who don&rsquo;t. Your ranking is based on couple
              feedback and category fit.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="w-32 text-muted">{label}</dt>
      <dd className="flex-1 text-plum">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-[28px] text-plum">{value.toLocaleString("en-US")}</div>
      <div className="text-[12px] text-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}

/* ───────────────────── Edit form ───────────────────── */

function EditForm({
  account,
  onSave,
  onCancel,
}: {
  account: VendorAccount;
  onSave: (_a: VendorAccount) => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
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

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor-portal/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Couldn't update");
      }
      const data = await res.json();
      onSave(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-summary p-6 space-y-4">
      <h2 className="font-serif text-[22px] text-plum">Edit profile</h2>

      <div>
        <label className="text-[13px] text-muted">Business Name</label>
        <input
          type="text"
          required
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
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[13px] text-muted">Contact email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border px-3 py-2 text-[15px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary flex-1">
          {submitting ? "Saving..." : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
