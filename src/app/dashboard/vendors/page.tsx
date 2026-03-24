"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Confetti, triggerConfetti } from "@/components/Confetti";
import { VENDOR_CATEGORIES, VENDOR_STATUSES } from "@/lib/vendors/categories";
import { Tooltip } from "@/components/Tooltip";
import { EmailTemplate } from "./EmailTemplate";
import { trackVendorAdded } from "@/lib/analytics";

type Vendor = {
  id: string;
  category: string;
  name: string;
  status: string;
  poc_name: string | null;
  poc_email: string | null;
  poc_phone: string | null;
  notes: string | null;
  amount: number | null;
  amount_paid: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  searching: "bg-lavender text-muted",
  contacted: "bg-blue-50 text-blue-600",
  quote_received: "badge-pending",
  booked: "badge-confirmed",
  deposit_paid: "badge-confirmed",
  paid_in_full: "bg-lavender text-violet",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [noWedding, setNoWedding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [emailCategory, setEmailCategory] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Add form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>(VENDOR_CATEGORIES[0]);
  const [newWebsite, setNewWebsite] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");

  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then(setVendors)
      .catch(() => toast.error("Failed to load vendors"))
      .finally(() => setLoading(false));
  }, []);

  async function addVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const tempId = crypto.randomUUID();
    const vendor: Vendor = {
      id: tempId,
      category: newCategory,
      name: newName.trim(),
      status: "searching",
      poc_name: null,
      poc_email: null,
      poc_phone: null,
      notes: null,
      amount: null,
      amount_paid: null,
    };

    setVendors((prev) => [...prev, vendor]);
    setNewName("");
    setShowAdd(false);

    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vendor.name, category: vendor.category }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setVendors((prev) => prev.map((v) => (v.id === tempId ? saved : v)));

      // Submit to directory for admin review (non-blocking)
      if (newCity || newWebsite) {
        fetch("/api/vendor-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: vendor.name,
            category: vendor.category,
            website: newWebsite || null,
            city: newCity || null,
            state: newState || null,
          }),
        }).catch(() => {});
      }

      setNewWebsite("");
      setNewCity("");
      setNewState("");
      trackVendorAdded(vendor.category);
      toast.success("Vendor added");
    } catch {
      setVendors((prev) => prev.filter((v) => v.id !== tempId));
      toast.error("Failed to add vendor");
    }
  }

  async function updateStatus(id: string, status: string) {
    const prev = vendors;
    setVendors((v) =>
      v.map((x) => (x.id === id ? { ...x, status } : x))
    );

    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();

      if (status === "booked") {
        triggerConfetti();
      }
    } catch {
      setVendors(prev);
      toast.error("Failed to update vendor");
    }
  }

  async function deleteVendor(id: string) {
    const prev = vendors;
    setVendors((v) => v.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Vendor removed");
    } catch {
      setVendors(prev);
      toast.error("Failed to remove vendor");
    }
  }

  // Group by category
  const grouped = new Map<string, Vendor[]>();
  for (const cat of VENDOR_CATEGORIES) {
    const catVendors = vendors.filter((v) => v.category === cat);
    if (catVendors.length > 0) {
      grouped.set(cat, catVendors);
    }
  }

  const bookedCount = vendors.filter(
    (v) => v.status === "booked" || v.status === "deposit_paid" || v.status === "paid_in_full"
  ).length;

  if (loading) {
    return <SkeletonList count={5} />;
  }

  if (noWedding) return <NoWeddingState feature="Vendors" />;

  return (
    <div>
      <Confetti />
      <div className="flex items-center justify-between">
        <div>
          <h1>Vendors <Tooltip text="Track every vendor through your booking pipeline — from initial search to final payment. Each vendor moves through stages so you always know where things stand." wide /></h1>
          <p className="mt-1 text-[15px] text-muted">
            {bookedCount} booked / {vendors.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/vendors/directory" className="btn-secondary">
            Browse Directory
          </Link>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary"
          >
            Add Your Own
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addVendor} className="mt-4 card p-4 space-y-3">
          <p className="text-[13px] text-muted">
            Add a vendor you&apos;ve found. We&apos;ll also save their info to help other couples.
            <Tooltip text="Only the vendor name and category are required. Website, city, and state are optional but help other couples discover this vendor in our directory." wide />
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Vendor name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Vendor name"
              className="rounded-[10px] border-border px-3 py-2 text-[15px]"
              required
              autoFocus
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="Vendor category"
              className="rounded-[10px] border-border px-3 py-2 text-[15px]"
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Website (optional)"
              value={newWebsite}
              onChange={(e) => setNewWebsite(e.target.value)}
              aria-label="Vendor website"
              className="rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="City (optional)"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                aria-label="Vendor city"
                className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
              />
              <input
                type="text"
                placeholder="State"
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                aria-label="Vendor state"
                className="rounded-[10px] border-border px-3 py-2 text-[15px] w-20"
                maxLength={2}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Add Vendor
          </button>
        </form>
      )}

      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([category, catVendors]) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[15px] font-semibold text-muted">{category}</h2>
              <button
                onClick={() => setEmailCategory(category)}
                className="text-[12px] text-violet hover:text-soft-violet"
              >
                Email template
              </button>
            </div>
            <div className="space-y-2">
              {catVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center gap-3 rounded-[16px] border-border bg-white px-4 py-3"
                >
                  <a
                    href={`/dashboard/vendors/${vendor.id}`}
                    className="flex-1 text-[15px] font-semibold text-plum hover:text-violet"
                  >
                    {vendor.name}
                  </a>
                  <select
                    value={vendor.status}
                    onChange={(e) => updateStatus(vendor.id, e.target.value)}
                    aria-label={`Status for ${vendor.name}`}
                    className={`rounded-full px-2 py-0.5 text-[12px] font-semibold border-0 ${
                      STATUS_COLORS[vendor.status] || ""
                    }`}
                  >
                    {VENDOR_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Tooltip text="Pipeline stages: Searching (researching options) → Contacted (reached out) → Quote Received (got pricing) → Booked (confirmed!) → Deposit Paid → Paid in Full." wide />
                  {vendor.amount !== null && (
                    <span className="text-[12px] text-muted">
                      ${vendor.amount.toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={() => setConfirmDelete(vendor.id)}
                    className="text-[12px] text-error hover:opacity-80"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {vendors.length === 0 && (
          <EmptyState
            icon="🏪"
            title="No vendors yet"
            message="Start by browsing our directory or adding your own vendors."
            actionLabel="Browse Directory"
            actionHref="/dashboard/vendors/directory"
          />
        )}
      </div>

      {emailCategory && (
        <EmailTemplate
          category={emailCategory}
          onClose={() => setEmailCategory(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete vendor?"
        message="This vendor and all its details will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) deleteVendor(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
