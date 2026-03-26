"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VENDOR_STATUSES } from "@/lib/vendors/categories";
import { EmailTemplate } from "../EmailTemplate";
import { Comments } from "@/components/Comments";
import { VendorCard } from "@/components/VendorCard";
import { FileUpload } from "@/components/FileUpload";
import { Tooltip } from "@/components/Tooltip";

type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
};

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
  arrival_time: string | null;
  meal_needed: boolean;
  insurance_submitted: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  searching: "bg-lavender text-muted",
  contacted: "bg-blue-50 text-blue-600",
  quote_received: "badge-pending",
  booked: "badge-confirmed",
  deposit_paid: "badge-confirmed",
  paid_in_full: "bg-lavender text-violet",
};

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const loadAttachments = useCallback((vid: string) => {
    fetch(`/api/attachments?entity_type=vendor&entity_id=${vid}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAttachments)
      .catch((e) => console.error("[fetch] attachments", e));
  }, []);

  useEffect(() => {
    params.then((p) => {
      setVendorId(p.id);
      fetch("/api/vendors")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((vendors: Vendor[]) => {
          const found = vendors.find((v) => v.id === p.id);
          setVendor(found || null);
        })
        .catch(() => toast.error("Couldn't load this vendor. Try refreshing."))
        .finally(() => setLoading(false));
      loadAttachments(p.id);
    });
  }, [params, loadAttachments]);

  async function deleteAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      if (vendorId) loadAttachments(vendorId);
      toast.error("Couldn't delete that file. Try again.");
    }
  }

  async function updateField(field: string, value: boolean | string | number | null) {
    if (!vendorId) return;
    const prev = vendor;
    setVendor((v) => (v ? { ...v, [field]: value } : v));

    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setVendor(prev);
      toast.error("Failed to update");
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (!vendor) {
    return (
      <div>
        <p className="text-[15px] text-muted">This vendor wasn&apos;t found. It may have been removed.</p>
        <button
          onClick={() => router.push("/dashboard/vendors")}
          className="mt-2 text-[15px] text-violet"
        >
          Back to vendors
        </button>
      </div>
    );
  }

  const statusIdx = VENDOR_STATUSES.findIndex((s) => s.value === vendor.status);

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push("/dashboard/vendors")}
        className="text-[15px] text-muted hover:text-plum mb-4"
      >
        &larr; All Vendors
      </button>

      <h1>{vendor.name}</h1>
      <p className="mt-1 text-[15px] text-muted">{vendor.category}</p>

      {/* Google Business Profile */}
      <div className="mt-4">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[12px] font-semibold text-muted">Google Business Profile</span>
          <Tooltip text="If this vendor has a Google Business listing, their rating, reviews, and contact info will appear here automatically." wide />
        </div>
        <VendorCard vendorId={vendor.id} />
      </div>

      {/* Status pipeline */}
      <div className="mt-6">
        <label className="text-[12px] font-semibold text-muted uppercase">
          Status <Tooltip text="Click any stage to update this vendor's progress. Stages: Searching (researching) → Contacted (reached out) → Quote Received (got pricing) → Booked (confirmed!) → Deposit Paid (partial payment) → Paid in Full (complete)." wide />
        </label>
        <div className="mt-2 flex gap-1">
          {VENDOR_STATUSES.map((s, i) => (
            <button
              key={s.value}
              onClick={() => updateField("status", s.value)}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-[10px] transition ${
                i <= statusIdx
                  ? STATUS_COLORS[vendor.status] || "bg-lavender"
                  : "bg-whisper text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact info */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-[12px] font-semibold text-muted">
            Contact Name <Tooltip text="Your point of contact (POC) at this vendor — the person you communicate with for quotes, contracts, and day-of coordination." wide />
          </label>
          <input
            type="text"
            defaultValue={vendor.poc_name || ""}
            onBlur={(e) => updateField("poc_name", e.target.value || null)}
            placeholder="Name"
            className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-muted">Email</label>
          <input
            type="email"
            defaultValue={vendor.poc_email || ""}
            onBlur={(e) => updateField("poc_email", e.target.value || null)}
            placeholder="email@example.com"
            className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-muted">Phone</label>
          <input
            type="tel"
            defaultValue={vendor.poc_phone || ""}
            onBlur={(e) => updateField("poc_phone", e.target.value || null)}
            placeholder="(555) 123-4567"
            className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          />
        </div>
      </div>

      {/* Financials */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[12px] font-semibold text-muted">
            Total Amount <Tooltip text="The full contracted price for this vendor. This feeds into your overall budget tracker." />
          </label>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-muted">$</span>
            <input
              type="number"
              defaultValue={vendor.amount ?? ""}
              onBlur={(e) =>
                updateField(
                  "amount",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-muted">
            Amount Paid <Tooltip text="Track deposits and installments here. Update this as you make payments so you can see the remaining balance at a glance." wide />
          </label>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-muted">$</span>
            <input
              type="number"
              defaultValue={vendor.amount_paid ?? ""}
              onBlur={(e) =>
                updateField(
                  "amount_paid",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
        </div>
      </div>

      {/* Day-of Details */}
      <div className="mt-6">
        <h2 className="text-[15px] font-semibold text-plum mb-3">Day-of Details <Tooltip text="Logistics for the wedding day: when the vendor arrives, whether they need a vendor meal, and if they've submitted required liability insurance to your venue." wide /></h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[12px] font-semibold text-muted">Arrival Time</label>
            <input
              type="time"
              defaultValue={vendor.arrival_time || ""}
              onChange={(e) => updateField("arrival_time", e.target.value || null)}
              className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Meal Needed?</label>
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vendor.meal_needed}
                  onChange={(e) => updateField("meal_needed", e.target.checked)}
                  className="accent-violet"
                />
                <span className="text-[14px] text-plum">Yes, needs a meal</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted">Insurance Submitted?</label>
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vendor.insurance_submitted}
                  onChange={(e) => updateField("insurance_submitted", e.target.checked)}
                  className="accent-violet"
                />
                <span className="text-[14px] text-plum">Yes, submitted</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6">
        <label className="text-[12px] font-semibold text-muted">Notes &amp; Special Instructions</label>
        <textarea
          defaultValue={vendor.notes || ""}
          onBlur={(e) => updateField("notes", e.target.value || null)}
          placeholder="Arrival instructions, specific requests, dietary needs, parking info..."
          rows={4}
          className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
        />
      </div>

      {/* Contracts & Documents */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-plum">Contracts &amp; Documents <Tooltip text="Upload contracts, proposals, invoices, or insurance certificates. Supported file types: PDF, images (JPG, PNG), and common document formats." wide /></h2>
          <FileUpload
            entityType="vendor"
            entityId={vendor.id}
            onUpload={() => loadAttachments(vendor.id)}
          />
        </div>
        {attachments.length > 0 ? (
          <div className="mt-3 space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-lavender/20 border border-border">
                <span className="text-[16px]">
                  {a.mime_type?.includes("pdf") ? "\u{1F4C4}" : a.mime_type?.startsWith("image/") ? "\u{1F5BC}" : "\u{1F4CE}"}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-semibold text-violet hover:text-soft-violet truncate block"
                  >
                    {a.file_name}
                  </a>
                  <p className="text-[11px] text-muted">
                    {(a.file_size / 1024).toFixed(0)} KB · {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteAttachment(a.id)}
                  className="text-[12px] text-error hover:opacity-80"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted">
            No files yet. Upload contracts, proposals, or invoices.
          </p>
        )}
      </div>

      {/* Email template */}
      <button
        onClick={() => setShowEmail(true)}
        className="btn-ghost mt-6"
      >
        View Email Template
      </button>

      {showEmail && (
        <EmailTemplate
          category={vendor.category}
          onClose={() => setShowEmail(false)}
        />
      )}

      {/* Comments */}
      <div className="mt-6 pt-6 border-t border-border">
        <Comments entityType="vendor" entityId={vendor.id} />
      </div>
    </div>
  );
}
