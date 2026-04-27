"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VENDOR_CATEGORIES } from "@/lib/vendors/categories";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];

export type Vendor = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  country: string | null;
  price_range: string | null;
  quality_score: number | null;
  featured: boolean;
  featured_locked: boolean;
  active: boolean;
  /** suggested_vendors.photos (jsonb). Each entry: {url, source, width,
   *  height, attribution, fetched_at}. Index 0 is the hero. May be null on
   *  rows that haven't been enriched yet. */
  photos: Array<{ url: string; attribution?: string; source?: string }> | null;
  // Audit / source fields (read-only in the modal)
  seed_source: string | null;
  gmb_place_id: string | null;
  gmb_last_refreshed_at: string | null;
  imported_at: string | null;
  import_source: string | null;
  created_at: string | null;
  updated_at: string | null;
  scraper_extras: Record<string, unknown> | null;
};

type GmbData = {
  rating: number | null;
  userRatingCount: number | null;
  formattedAddress: string | null;
  websiteUri: string | null;
  nationalPhoneNumber: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  editorialSummary: string | null;
  reviews: Array<{ authorName: string; rating: number; text: string; relativeTime: string }>;
};

type Props = {
  vendor: Vendor;
  onClose: () => void;
  onSaved: (updated: Vendor) => void;
  onDeleted: (id: string) => void;
};

const EDITABLE_KEYS = [
  "name", "category", "description", "website", "phone", "email",
  "address", "city", "state", "zip", "country", "price_range",
  "quality_score",
  "featured", "featured_locked", "active",
] as const;

type EditableKey = typeof EDITABLE_KEYS[number];
type FormState = Pick<Vendor, EditableKey>;

function pickEditable(v: Vendor): FormState {
  const out = {} as FormState;
  for (const k of EDITABLE_KEYS) {
    (out as Record<string, unknown>)[k] = v[k];
  }
  return out;
}

function shallowEqual(a: FormState, b: FormState): boolean {
  for (const k of EDITABLE_KEYS) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function VendorEditModal({ vendor, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormState>(pickEditable(vendor));
  const [original] = useState<FormState>(pickEditable(vendor));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gmb, setGmb] = useState<GmbData | null>(null);
  const [gmbLoading, setGmbLoading] = useState(false);
  const [gmbError, setGmbError] = useState<string | null>(null);
  const [gmbExpanded, setGmbExpanded] = useState(false);

  const dirty = !shallowEqual(form, original);

  // Lazy-load GMB data when the section is first expanded.
  useEffect(() => {
    if (!gmbExpanded || gmb || gmbLoading || gmbError) return;
    setGmbLoading(true);
    fetch(`/api/suggested-vendors/${vendor.id}/gmb`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => setGmb(data))
      .catch((err) => setGmbError(err.message || "GMB fetch failed"))
      .finally(() => setGmbLoading(false));
  }, [gmbExpanded, vendor.id, gmb, gmbLoading, gmbError]);

  function setField<K extends EditableKey>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/suggested-vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success("Vendor saved");
      onSaved(data as Vendor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      console.error("[VendorEdit] save:", msg);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteVendor() {
    if (!confirm(`Permanently remove "${vendor.name}" from the directory? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/suggested-vendors/${vendor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      toast.success("Vendor removed");
      onDeleted(vendor.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      console.error("[VendorEdit] delete:", msg);
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-plum/50 flex items-start justify-center overflow-y-auto p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl max-w-3xl w-full my-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[18px] truncate">{vendor.name || "Untitled vendor"}</h2>
            <p className="text-[12px] text-muted mt-0.5">
              {vendor.category} · {vendor.city}, {vendor.state}
              {vendor.seed_source && <> · source: <code className="bg-lavender px-1 rounded">{vendor.seed_source}</code></>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {vendor.active ? (
              <a
                href={`/dashboard/vendors/directory?expand=${vendor.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
                title="Open the public directory in a new tab and auto-expand this vendor"
              >
                Preview as couple ↗
              </a>
            ) : (
              <span
                className="btn-ghost btn-sm opacity-50 cursor-not-allowed"
                title="Inactive vendors aren't visible to couples — toggle Active first"
              >
                Preview as couple ↗
              </span>
            )}
            <button onClick={onClose} className="btn-ghost btn-sm">Close</button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Editable fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="vname">Name</label>
              <input
                id="vname"
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vcat">Category</label>
              <select
                id="vcat"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full mt-1.5"
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vprice">Price range</label>
              <select
                id="vprice"
                value={form.price_range || ""}
                onChange={(e) => setField("price_range", e.target.value || null)}
                className="w-full mt-1.5"
              >
                <option value="">— not set —</option>
                {PRICE_RANGES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vscore">
                Quality score{" "}
                <span className="text-muted text-[11px] font-normal">(admin-only, not shown to couples)</span>
              </label>
              <input
                id="vscore"
                type="number"
                step="0.01"
                value={form.quality_score ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (v === "") return setField("quality_score", null);
                  const n = Number(v);
                  setField("quality_score", Number.isFinite(n) ? n : null);
                }}
                placeholder="e.g. 87.4"
                className="w-full mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="vdesc">Description</label>
              <textarea
                id="vdesc"
                value={form.description ?? ""}
                onChange={(e) => setField("description", e.target.value || null)}
                rows={3}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vweb">Website</label>
              <input
                id="vweb"
                type="url"
                value={form.website ?? ""}
                onChange={(e) => setField("website", e.target.value || null)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vphone">Phone</label>
              <input
                id="vphone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value || null)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vemail">Email</label>
              <input
                id="vemail"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value || null)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vaddr">Street address</label>
              <input
                id="vaddr"
                type="text"
                value={form.address ?? ""}
                onChange={(e) => setField("address", e.target.value || null)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vcity">City</label>
              <input
                id="vcity"
                type="text"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vstate">State</label>
              <select
                id="vstate"
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                className="w-full mt-1.5"
              >
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="vzip">ZIP</label>
              <input
                id="vzip"
                type="text"
                value={form.zip ?? ""}
                onChange={(e) => setField("zip", e.target.value || null)}
                className="w-full mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="vcountry">Country</label>
              <input
                id="vcountry"
                type="text"
                value={form.country ?? "US"}
                onChange={(e) => setField("country", e.target.value || null)}
                className="w-full mt-1.5"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-4 mt-2">
              <label className="inline-flex items-center gap-2 font-normal">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField("featured", e.target.checked)}
                  className="w-4 h-4"
                />
                Featured{" "}
                <span className="text-muted text-[11px] font-normal">
                  {form.featured_locked
                    ? "(locked — auto-rule won't change this)"
                    : "(auto-managed: top 10% by score per category)"}
                </span>
              </label>
              <label className="inline-flex items-center gap-2 font-normal">
                <input
                  type="checkbox"
                  checked={form.featured_locked}
                  onChange={(e) => setField("featured_locked", e.target.checked)}
                  className="w-4 h-4"
                />
                Lock featured value{" "}
                <span className="text-muted text-[11px] font-normal">(opt out of the auto-rule)</span>
              </label>
              <label className="inline-flex items-center gap-2 font-normal">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                  className="w-4 h-4"
                />
                Active (visible to couples)
              </label>
            </div>
          </div>

          {/* Photos preview — surfaced from suggested_vendors.photos (jsonb). */}
          {vendor.photos && vendor.photos.length > 0 && (
            <div className="border border-border rounded-lg p-3">
              <p className="text-[14px] font-medium mb-2">
                Photos <span className="text-muted text-[12px] font-normal">({vendor.photos.length})</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {vendor.photos.slice(0, 6).map((p, i) => {
                  const src = p.url;
                  if (!src) return null;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={i}
                      src={src}
                      alt={`${vendor.name} photo ${i + 1}`}
                      title={p.attribution}
                      className="aspect-square object-cover rounded-md border border-border"
                    />
                  );
                })}
              </div>
              {vendor.photos.length > 6 && (
                <p className="text-[12px] text-muted mt-2">
                  +{vendor.photos.length - 6} more
                </p>
              )}
            </div>
          )}

          {/* Read-only audit metadata */}
          <details className="border border-border rounded-lg p-3 bg-whisper">
            <summary className="cursor-pointer text-[14px] font-medium">Audit + source metadata</summary>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-[12px]">
              <Field label="Vendor ID" value={vendor.id} mono />
              <Field label="Seed source" value={vendor.seed_source || "—"} mono />
              <Field label="Description status" value={describeDescriptionStatus(vendor.scraper_extras)} />
              <Field label="GMB place ID" value={vendor.gmb_place_id || "—"} mono />
              <Field label="GMB last refreshed" value={fmtDate(vendor.gmb_last_refreshed_at)} />
              <Field label="Imported at" value={fmtDate(vendor.imported_at)} />
              <Field label="Import batch label" value={vendor.import_source || "—"} />
              <Field label="Created" value={fmtDate(vendor.created_at)} />
              <Field label="Updated" value={fmtDate(vendor.updated_at)} />
              <Field
                label="Business status"
                value={(vendor.scraper_extras?.business_status as string | undefined) || "—"}
              />
              <Field
                label="Photo count"
                value={vendor.photos?.length ?? 0}
              />
              <Field
                label="Social URLs"
                value={renderSocial(vendor.scraper_extras)}
              />
              <Field
                label="Verified by scraper"
                value={renderVerified(vendor.scraper_extras)}
              />
              <Field
                label="Google Maps"
                value={renderMapLink(vendor.scraper_extras)}
              />
            </dl>
          </details>

          {/* Lazy-loaded GMB enrichment */}
          <details
            className="border border-border rounded-lg p-3"
            open={gmbExpanded}
            onToggle={(e) => setGmbExpanded((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-[14px] font-medium">
              Live Google Business data (rating, reviews, hours, photos)
            </summary>
            <div className="mt-3 text-[13px]">
              {gmbLoading && <p className="text-muted">Fetching from Google…</p>}
              {gmbError && <p className="text-declined-text">Couldn&rsquo;t fetch: {gmbError}</p>}
              {gmb && (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Rating" value={gmb.rating !== null ? `${gmb.rating} ★` : "—"} />
                    <Field label="Review count" value={gmb.userRatingCount !== null ? String(gmb.userRatingCount) : "—"} />
                    <Field label="Business status" value={gmb.businessStatus || "—"} />
                    <Field label="Google Maps" value={gmb.googleMapsUri ? <a href={gmb.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-violet underline">Open</a> : "—"} />
                    <Field label="GMB website" value={gmb.websiteUri || "—"} />
                    <Field label="GMB phone" value={gmb.nationalPhoneNumber || "—"} />
                    <Field label="GMB address" value={gmb.formattedAddress || "—"} />
                  </div>
                  {gmb.editorialSummary && (
                    <div>
                      <p className="text-[12px] text-muted">Editorial summary</p>
                      <p className="text-plum">{gmb.editorialSummary}</p>
                    </div>
                  )}
                  {gmb.reviews.length > 0 && (
                    <div>
                      <p className="text-[12px] text-muted mb-2">Recent reviews</p>
                      <div className="space-y-2">
                        {gmb.reviews.map((r, i) => (
                          <div key={i} className="border-l-2 border-petal pl-3 py-1">
                            <p className="text-[12px] text-muted">
                              {r.authorName} · {r.rating} ★ · {r.relativeTime}
                            </p>
                            <p className="text-[13px] text-plum">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4 bg-whisper">
          <button
            onClick={deleteVendor}
            disabled={deleting || saving}
            className="btn-destructive btn-sm"
          >
            {deleting ? "Removing…" : "Remove from directory"}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
            <button
              onClick={save}
              disabled={!dirty || saving || deleting}
              className="btn-primary btn-sm"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono text-[11px] text-plum break-all" : "text-plum"}>{value}</dd>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function describeDescriptionStatus(extras: Record<string, unknown> | null): React.ReactNode {
  const status = extras?.description_status as string | undefined;
  if (!status) return "—";
  const colorClass =
    status === "ai_generated" || status === "manually_written"
      ? "text-confirmed-text"
      : "text-declined-text";
  return <span className={colorClass}>{status}</span>;
}

function renderVerified(extras: Record<string, unknown> | null): React.ReactNode {
  if (!extras || extras.verified !== true) return "—";
  const method = typeof extras.verification_method === "string" ? extras.verification_method : null;
  const at = typeof extras.verified_at === "string" ? extras.verified_at : null;
  return (
    <span className="text-confirmed-text">
      ✓ {method || "verified"}
      {at && <span className="text-muted"> · {fmtDate(at)}</span>}
    </span>
  );
}

function renderMapLink(extras: Record<string, unknown> | null): React.ReactNode {
  const url = extras && typeof extras.google_maps_url === "string" ? extras.google_maps_url : null;
  if (!url) return "—";
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-violet underline">
      Open
    </a>
  );
}

function renderSocial(extras: Record<string, unknown> | null): React.ReactNode {
  if (!extras) return "—";
  const links: Array<[string, string]> = [];
  if (typeof extras.instagram === "string" && extras.instagram) links.push(["IG", extras.instagram]);
  if (typeof extras.facebook === "string" && extras.facebook) links.push(["FB", extras.facebook]);
  if (typeof extras.pinterest === "string" && extras.pinterest) links.push(["PIN", extras.pinterest]);
  if (links.length === 0) return "—";
  return (
    <span className="flex gap-2 flex-wrap">
      {links.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-violet underline">
          {label}
        </a>
      ))}
    </span>
  );
}
