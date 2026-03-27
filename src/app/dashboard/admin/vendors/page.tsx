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
  const [showImport, setShowImport] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "featured" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"directory" | "submissions">("directory");

  // Add form state
  const [form, setForm] = useState({
    name: "", category: VENDOR_CATEGORIES[0] as string, description: "",
    website: "", phone: "", email: "", city: "", state: "",
    price_range: "" as string, featured: false,
  });

  // Import form state
  const [importForm, setImportForm] = useState({
    supabase_url: "",
    supabase_key: "",
    table_name: "vendors",
    filter_column: "",
    filter_value: "",
    import_source: "",
  });
  const [importResult, setImportResult] = useState<{
    dry_run?: boolean;
    imported?: number;
    would_import?: number;
    skipped_invalid?: number;
    duplicates?: number;
    total_remote?: number;
    preview?: Array<{ name: string; category: string; city: string; state: string }>;
    message?: string;
    errors?: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

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

  async function runImport(dryRun: boolean) {
    setImporting(true);
    setImportResult(null);
    try {
      const payload: Record<string, unknown> = {
        supabase_url: importForm.supabase_url,
        supabase_key: importForm.supabase_key,
        table_name: importForm.table_name || "vendors",
        import_source: importForm.import_source || undefined,
        dry_run: dryRun,
      };
      if (importForm.filter_column && importForm.filter_value) {
        payload.filters = { [importForm.filter_column]: importForm.filter_value };
      }
      const res = await fetch("/api/admin/suggested-vendors/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      setImportResult(data);
      if (!dryRun && data.imported > 0) {
        toast.success(`Imported ${data.imported} vendors`);
        // Reload vendor list
        const r = await fetch("/api/admin/suggested-vendors");
        if (r.ok) setVendors(await r.json());
      }
    } catch {
      toast.error("Import request failed. Check the connection details.");
    } finally {
      setImporting(false);
    }
  }

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  const filtered = vendors.filter((v) => {
    if (filterCategory && v.category !== filterCategory) return false;
    if (filterState && v.state !== filterState) return false;
    if (filterStatus === "featured" && !v.featured) return false;
    if (filterStatus === "active" && !v.active) return false;
    if (filterStatus === "inactive" && v.active) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!v.name.toLowerCase().includes(q) && !v.city?.toLowerCase().includes(q) && !v.email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Get unique states from actual data for the filter dropdown
  const vendorStates = [...new Set(vendors.map((v) => v.state).filter(Boolean))].sort();

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
        <div className="flex gap-2">
          <button onClick={() => { setShowImport(!showImport); setShowAdd(false); }} className="btn-secondary">
            Import from Supabase
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setShowImport(false); }} className="btn-primary">
            Add Vendor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-border">
        <button onClick={() => setTab("directory")} className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${tab === "directory" ? "border-violet text-violet" : "border-transparent text-plum/60"}`}>
          Directory ({vendors.length})
        </button>
        <button onClick={() => setTab("submissions")} className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${tab === "submissions" ? "border-violet text-violet" : "border-transparent text-plum/60"}`}>
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
      {/* Search and filters */}
      <div className="mt-4 flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[10px] border-border pl-9 pr-3 py-1.5 text-[15px]"
          />
        </div>
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
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
        >
          <option value="">All States</option>
          {vendorStates.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
        >
          <option value="all">All Status</option>
          <option value="featured">Featured Only</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <span className="text-[13px] text-muted">{filtered.length} shown</span>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="mt-4 card p-5 space-y-4">
          <h3>Import from remote Supabase</h3>
          <p className="text-[13px] text-muted">
            Connect to another Supabase project and pull vendor records into the directory.
            Duplicates (same name + city + state) are automatically skipped.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[13px] font-medium text-muted mb-1">Supabase URL</label>
              <input
                type="url"
                value={importForm.supabase_url}
                onChange={(e) => setImportForm((f) => ({ ...f, supabase_url: e.target.value }))}
                placeholder="https://xyz.supabase.co"
                className="w-full rounded-[10px] border-border px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted mb-1">Service Role Key</label>
              <input
                type="password"
                value={importForm.supabase_key}
                onChange={(e) => setImportForm((f) => ({ ...f, supabase_key: e.target.value }))}
                placeholder="eyJhbGci..."
                className="w-full rounded-[10px] border-border px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted mb-1">Table name</label>
              <input
                type="text"
                value={importForm.table_name}
                onChange={(e) => setImportForm((f) => ({ ...f, table_name: e.target.value }))}
                placeholder="vendors"
                className="w-full rounded-[10px] border-border px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted mb-1">Source label</label>
              <input
                type="text"
                value={importForm.import_source}
                onChange={(e) => setImportForm((f) => ({ ...f, import_source: e.target.value }))}
                placeholder="e.g. WeddingWire TX vendors, March 2026"
                className="w-full rounded-[10px] border-border px-3 py-2 text-[14px]"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[13px] font-medium text-muted mb-1">Filter column (optional)</label>
                <input
                  type="text"
                  value={importForm.filter_column}
                  onChange={(e) => setImportForm((f) => ({ ...f, filter_column: e.target.value }))}
                  placeholder="e.g. status"
                  className="w-full rounded-[10px] border-border px-3 py-2 text-[14px]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[13px] font-medium text-muted mb-1">Filter value</label>
                <input
                  type="text"
                  value={importForm.filter_value}
                  onChange={(e) => setImportForm((f) => ({ ...f, filter_value: e.target.value }))}
                  placeholder="e.g. active"
                  className="w-full rounded-[10px] border-border px-3 py-2 text-[14px]"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => runImport(true)}
              disabled={importing || !importForm.supabase_url || !importForm.supabase_key}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              {importing ? "Checking..." : "Preview import"}
            </button>
            <button
              type="button"
              onClick={() => runImport(false)}
              disabled={importing || !importForm.supabase_url || !importForm.supabase_key}
              className="btn-primary btn-sm disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import now"}
            </button>
          </div>
          {importResult && (
            <div className="bg-lavender rounded-[10px] p-4 text-[13px] space-y-2">
              {importResult.dry_run && (
                <p className="font-semibold text-violet">Preview (no changes made)</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {importResult.total_remote != null && (
                  <div><span className="text-muted">Remote records:</span> {importResult.total_remote}</div>
                )}
                {importResult.would_import != null && (
                  <div><span className="text-muted">Would import:</span> {importResult.would_import}</div>
                )}
                {importResult.imported != null && !importResult.dry_run && (
                  <div><span className="text-muted">Imported:</span> {importResult.imported}</div>
                )}
                {importResult.duplicates != null && (
                  <div><span className="text-muted">Duplicates skipped:</span> {importResult.duplicates}</div>
                )}
                {importResult.skipped_invalid != null && importResult.skipped_invalid > 0 && (
                  <div><span className="text-muted">Invalid (missing fields):</span> {importResult.skipped_invalid}</div>
                )}
              </div>
              {importResult.message && <p className="text-muted">{importResult.message}</p>}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="text-red-600">
                  {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}
              {importResult.preview && importResult.preview.length > 0 && (
                <div>
                  <p className="font-medium text-muted mt-2">Sample records:</p>
                  <div className="mt-1 space-y-1">
                    {importResult.preview.map((v, i) => (
                      <p key={i} className="text-plum">{v.name} — {v.category} — {v.city}, {v.state}</p>
                    ))}
                    {importResult.would_import && importResult.would_import > 10 && (
                      <p className="text-muted">...and {importResult.would_import - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
