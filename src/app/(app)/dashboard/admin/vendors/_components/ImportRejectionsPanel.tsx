"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type RawScraperRow = {
  id?: string;
  name?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  eydn_score?: number | null;
  price_level?: number | null;
  description?: string | null;
};

type Rejection = {
  id: string;
  scraper_id: string;
  scraper_data: RawScraperRow;
  failed_rules: string[];
  rejected_at: string;
  overridden_at: string | null;
  overridden_by: string | null;
};

type Status = "pending" | "overridden" | "all";

export function ImportRejectionsPanel({ onOverride }: { onOverride: () => void }) {
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("pending");
  const [overriding, setOverriding] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetch(`/api/admin/vendor-import-rejections?status=${status}&limit=200`)
      .then((r) => (r.ok ? r.json() : { rejections: [] }))
      .then((data) => setRejections(data.rejections || []))
      .catch(() => toast.error("Failed to load rejections"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function override(id: string) {
    if (!confirm("Override this rejection and add the vendor to the directory?")) return;
    setOverriding(id);
    try {
      const res = await fetch(`/api/admin/vendor-import-rejections/${id}/override`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success("Vendor added to directory");
      onOverride();
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Override failed";
      toast.error(msg);
    } finally {
      setOverriding(null);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[15px] font-semibold text-plum">Auto-import rejections</h3>
          <p className="text-[13px] text-muted mt-1">
            Vendors the scraper-import cron filtered out for failing quality rules. Click Override to add one to the directory anyway (the override is recorded; future runs will not re-reject this vendor).
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
        >
          <option value="pending">Pending review</option>
          <option value="overridden">Overridden</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <p className="text-[14px] text-muted py-4">Loading…</p>
      ) : rejections.length === 0 ? (
        <p className="text-[14px] text-muted py-4">
          {status === "pending"
            ? "No pending rejections — the cron is happy."
            : status === "overridden"
              ? "No overrides yet."
              : "No rejections yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {rejections.map((r) => {
            const raw = r.scraper_data || {};
            const cityState = [raw.city, raw.state].filter(Boolean).join(", ");
            return (
              <details key={r.id} className="border border-border rounded-lg">
                <summary className="cursor-pointer px-4 py-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-plum truncate">
                        {raw.name || "(unnamed)"}
                      </span>
                      <span className="text-[12px] text-muted">
                        {raw.category || "no category"} · {cityState || "no location"}
                      </span>
                      {raw.eydn_score !== null && raw.eydn_score !== undefined && (
                        <span className="text-[11px] text-muted">score: <strong className="text-plum">{raw.eydn_score}</strong></span>
                      )}
                      {r.overridden_at && (
                        <span className="badge badge-confirmed text-[11px]">Overridden</span>
                      )}
                    </div>
                    <p className="text-[12px] text-declined-text mt-1">
                      {r.failed_rules.join(" · ")}
                    </p>
                  </div>
                  {!r.overridden_at && (
                    <button
                      onClick={(e) => { e.preventDefault(); override(r.id); }}
                      disabled={overriding === r.id}
                      className="btn-secondary btn-sm shrink-0"
                    >
                      {overriding === r.id ? "Adding…" : "Override + Add"}
                    </button>
                  )}
                </summary>
                <div className="border-t border-border px-4 py-3 bg-whisper">
                  <dl className="grid gap-2 sm:grid-cols-2 text-[12px]">
                    <Field label="Phone" value={raw.phone || "—"} />
                    <Field label="Website" value={raw.website || "—"} />
                    <Field label="Email" value={raw.email || "—"} />
                    <Field label="Street" value={raw.street || "—"} />
                    <Field label="Price level" value={raw.price_level ?? "—"} />
                    <Field label="Scraper ID" value={r.scraper_id} mono />
                  </dl>
                  {raw.description && (
                    <div className="mt-3">
                      <p className="text-[11px] text-muted uppercase tracking-wide">Description</p>
                      <p className="text-[13px] text-plum mt-1">{raw.description}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-muted mt-3">
                    Rejected {new Date(r.rejected_at).toLocaleString()}
                    {r.overridden_at && (
                      <> · Overridden {new Date(r.overridden_at).toLocaleString()}</>
                    )}
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      )}
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
