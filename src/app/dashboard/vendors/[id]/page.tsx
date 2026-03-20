"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VENDOR_STATUSES } from "@/lib/vendors/categories";
import { EmailTemplate } from "../EmailTemplate";

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

  useEffect(() => {
    params.then((p) => {
      setVendorId(p.id);
      fetch("/api/vendors")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((vendors: Vendor[]) => {
          const found = vendors.find((v) => v.id === p.id);
          setVendor(found || null);
        })
        .catch(() => toast.error("Failed to load vendor"))
        .finally(() => setLoading(false));
    });
  }, [params]);

  async function updateField(field: string, value: string | number | null) {
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
        <p className="text-[15px] text-muted">Vendor not found.</p>
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

      {/* Status pipeline */}
      <div className="mt-6">
        <label className="text-[12px] font-semibold text-muted uppercase">
          Status
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
            Contact Name
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
            Total Amount
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
            Amount Paid
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

      {/* Notes */}
      <div className="mt-6">
        <label className="text-[12px] font-semibold text-muted">Notes</label>
        <textarea
          defaultValue={vendor.notes || ""}
          onBlur={(e) => updateField("notes", e.target.value || null)}
          placeholder="Add notes about this vendor..."
          rows={4}
          className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
        />
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
    </div>
  );
}
