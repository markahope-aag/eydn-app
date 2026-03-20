"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { VENDOR_CATEGORIES } from "@/lib/vendors/categories";

type SuggestedVendor = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string;
  state: string;
  price_range: string | null;
  featured: boolean;
};

export default function VendorDirectoryPage() {
  const [vendors, setVendors] = useState<SuggestedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/suggested-vendors")
      .then((r) => (r.ok ? r.json() : []))
      .then(setVendors)
      .catch(() => toast.error("Failed to load directory"))
      .finally(() => setLoading(false));
  }, []);

  async function addToMyVendors(vendor: SuggestedVendor) {
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vendor.name,
          category: vendor.category,
          poc_email: vendor.email,
          poc_phone: vendor.phone,
          status: "contacted",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${vendor.name} added to your vendors`);
    } catch {
      toast.error("Failed to add vendor");
    }
  }

  const filtered = vendors.filter((v) => {
    if (filterCategory && v.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.state.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const featured = filtered.filter((v) => v.featured);
  const regular = filtered.filter((v) => !v.featured);

  if (loading) return <p className="text-[15px] text-muted py-8">Loading...</p>;

  return (
    <div>
      <h1>Vendor Directory</h1>
      <p className="mt-1 text-[15px] text-muted">
        Browse recommended vendors in your area. Add any to your vendor list.
      </p>

      {/* Search + filters */}
      <div className="mt-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px]"
        >
          <option value="">All Categories</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mt-6">
          <h2>Featured</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {featured.map((v) => (
              <VendorCard key={v.id} vendor={v} onAdd={addToMyVendors} />
            ))}
          </div>
        </div>
      )}

      {/* All vendors */}
      <div className="mt-6">
        {featured.length > 0 && <h2>All vendors</h2>}
        <div className="mt-3 space-y-2">
          {regular.map((v) => (
            <div key={v.id} className="card-list flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <span className="text-[15px] font-semibold text-plum">{v.name}</span>
                <p className="text-[12px] text-muted">
                  {v.category} · {v.city}, {v.state} {v.price_range && `· ${v.price_range}`}
                </p>
                {v.description && (
                  <p className="text-[13px] text-muted mt-1">{v.description}</p>
                )}
              </div>
              {v.website && (
                <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-[12px] text-violet hover:text-soft-violet">
                  Website
                </a>
              )}
              <button onClick={() => addToMyVendors(v)} className="btn-secondary btn-sm">
                Add
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-[15px] text-muted text-center py-8">
            No vendors found. Try a different search or category.
          </p>
        )}
      </div>
    </div>
  );
}

function VendorCard({ vendor, onAdd }: { vendor: SuggestedVendor; onAdd: (v: SuggestedVendor) => void }) {
  return (
    <div className="card-summary p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-plum">{vendor.name}</h3>
          <p className="text-[12px] text-muted">
            {vendor.category} · {vendor.city}, {vendor.state}
          </p>
        </div>
        {vendor.price_range && (
          <span className="text-[13px] font-semibold text-violet">{vendor.price_range}</span>
        )}
      </div>
      {vendor.description && (
        <p className="text-[13px] text-muted mt-2">{vendor.description}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={() => onAdd(vendor)} className="btn-primary btn-sm">
          Add to my vendors
        </button>
        {vendor.website && (
          <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}
