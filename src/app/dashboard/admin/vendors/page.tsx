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
  active: boolean;
};

type Submission = {
  id: string;
  submitted_by: string;
  name: string;
  category: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  status: string;
  created_at: string;
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<SuggestedVendor[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [tab, setTab] = useState<"directory" | "submissions">("directory");

  // Add form state
  const [form, setForm] = useState({
    name: "", category: VENDOR_CATEGORIES[0] as string, description: "",
    website: "", phone: "", email: "", city: "", state: "",
    price_range: "" as string, featured: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/suggested-vendors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/vendor-submissions").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, s]) => { setVendors(v); setSubmissions(s); })
      .catch(() => toast.error("Failed to load vendors"))
      .finally(() => setLoading(false));
  }, []);

  async function addVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.city || !form.state) return;

    try {
      const res = await fetch("/api/admin/suggested-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setVendors((prev) => [...prev, saved]);
      setForm({ name: "", category: VENDOR_CATEGORIES[0] as string, description: "", website: "", phone: "", email: "", city: "", state: "", price_range: "", featured: false });
      setShowAdd(false);
      toast.success("Vendor added to directory");
    } catch {
      toast.error("Failed to add vendor");
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setVendors((v) => v.map((x) => (x.id === id ? { ...x, active } : x)));
    try {
      const res = await fetch(`/api/admin/suggested-vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setVendors((v) => v.map((x) => (x.id === id ? { ...x, active: !active } : x)));
      toast.error("Failed to update");
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    setVendors((v) => v.map((x) => (x.id === id ? { ...x, featured } : x)));
    try {
      const res = await fetch(`/api/admin/suggested-vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setVendors((v) => v.map((x) => (x.id === id ? { ...x, featured: !featured } : x)));
      toast.error("Failed to update");
    }
  }

  async function deleteVendor(id: string) {
    const prev = vendors;
    setVendors((v) => v.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/admin/suggested-vendors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Vendor removed");
    } catch {
      setVendors(prev);
      toast.error("Failed to remove");
    }
  }

  async function reviewSubmission(id: string, status: "approved" | "rejected") {
    setSubmissions((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/admin/vendor-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "approved" ? "Approved and added to directory" : "Submission rejected");
      if (status === "approved") {
        // Reload vendors
        const r = await fetch("/api/admin/suggested-vendors");
        if (r.ok) setVendors(await r.json());
      }
    } catch {
      toast.error("Failed to update submission");
    }
  }

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  const filtered = filterCategory
    ? vendors.filter((v) => v.category === filterCategory)
    : vendors;

  if (loading) return <p className="text-[15px] text-muted py-8">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1>Vendor Directory</h1>
          <p className="mt-1 text-[15px] text-muted">
            {vendors.length} vendors across {new Set(vendors.map((v) => v.category)).size} categories
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          Add Vendor
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-border">
        <button onClick={() => setTab("directory")} className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${tab === "directory" ? "border-violet text-violet" : "border-transparent text-muted"}`}>
          Directory ({vendors.length})
        </button>
        <button onClick={() => setTab("submissions")} className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${tab === "submissions" ? "border-violet text-violet" : "border-transparent text-muted"}`}>
          Submissions {pendingSubmissions.length > 0 && <span className="ml-1 bg-violet text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingSubmissions.length}</span>}
        </button>
      </div>

      {tab === "submissions" && (
        <div className="mt-4 space-y-2">
          {pendingSubmissions.length === 0 ? (
            <p className="text-[15px] text-muted text-center py-8">No pending submissions.</p>
          ) : (
            pendingSubmissions.map((s) => (
              <div key={s.id} className="card-list flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <span className="text-[15px] font-semibold text-plum">{s.name}</span>
                  <p className="text-[12px] text-muted">
                    {s.category} {s.city && `· ${s.city}`}{s.state && `, ${s.state}`}
                    {s.website && ` · ${s.website}`}
                  </p>
                  <p className="text-[10px] text-muted mt-1">
                    Submitted {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => reviewSubmission(s.id, "approved")} className="btn-primary btn-sm">Approve</button>
                <button onClick={() => reviewSubmission(s.id, "rejected")} className="btn-destructive btn-sm">Reject</button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "directory" && <>
      {/* Filter */}
      <div className="mt-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
        >
          <option value="">All Categories</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addVendor} className="mt-4 card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="text" placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]" required />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]">
              {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]" required />
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]" required>
              <option value="">State</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]" />
            <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]" />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]" />
            <select value={form.price_range} onChange={(e) => setForm({ ...form, price_range: e.target.value })} className="rounded-[10px] border-border px-3 py-2 text-[15px]">
              <option value="">Price range</option>
              <option value="$">$ — Budget</option>
              <option value="$$">$$ — Mid-range</option>
              <option value="$$$">$$$ — Premium</option>
              <option value="$$$$">$$$$ — Luxury</option>
            </select>
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none" rows={2} />
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-violet" />
            Featured vendor
          </label>
          <button type="submit" className="btn-primary">Add to Directory</button>
        </form>
      )}

      {/* Vendor list */}
      <div className="mt-6 space-y-2">
        {filtered.map((v) => (
          <div key={v.id} className="card-list flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-plum">{v.name}</span>
                {v.featured && <span className="badge badge-booked">Featured</span>}
                {!v.active && <span className="badge badge-declined">Inactive</span>}
              </div>
              <p className="text-[12px] text-muted">
                {v.category} · {v.city}, {v.state} {v.price_range && `· ${v.price_range}`}
              </p>
            </div>
            <label className="flex items-center gap-1 text-[12px] text-muted">
              <input type="checkbox" checked={v.featured} onChange={(e) => toggleFeatured(v.id, e.target.checked)} className="accent-violet" />
              Featured
            </label>
            <label className="flex items-center gap-1 text-[12px] text-muted">
              <input type="checkbox" checked={v.active} onChange={(e) => toggleActive(v.id, e.target.checked)} className="accent-violet" />
              Active
            </label>
            <button onClick={() => deleteVendor(v.id)} className="btn-destructive btn-sm">Remove</button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-[15px] text-muted text-center py-8">
            No vendors in the directory yet. Add one above.
          </p>
        )}
      </div>
      </>}
    </div>
  );
}
