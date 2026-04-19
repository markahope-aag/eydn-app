"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [promoSort, setPromoSort] = useState<"code" | "discount" | "status" | "created" | "expires">("created");

  // Create form state
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/promo-codes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCodes)
      .catch(() => toast.error("Failed to load promo codes"))
      .finally(() => setLoading(false));
  }, []);

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          discount_type: discountType,
          discount_value: Number(discountValue),
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expiresAt || null,
          description: description || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      const created = await res.json();
      setCodes((prev) => [created, ...prev]);
      setNewCode("");
      setDiscountValue("");
      setMaxUses("");
      setExpiresAt("");
      setDescription("");
      setShowCreate(false);
      toast.success(`Promo code ${created.code} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create promo code");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const prev = codes;
    setCodes((c) => c.map((p) => (p.id === id ? { ...p, is_active: isActive } : p)));

    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: isActive }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCodes(prev);
      toast.error("Failed to update");
    }
  }

  const sortedCodes = [...codes].sort((a, b) => {
    switch (promoSort) {
      case "code":
        return a.code.localeCompare(b.code);
      case "discount":
        return b.discount_value - a.discount_value;
      case "status": {
        const aExpired = a.expires_at && new Date(a.expires_at) < new Date();
        const bExpired = b.expires_at && new Date(b.expires_at) < new Date();
        const aActive = a.is_active && !aExpired ? 1 : 0;
        const bActive = b.is_active && !bExpired ? 1 : 0;
        return bActive - aActive;
      }
      case "created":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "expires": {
        if (!a.expires_at && !b.expires_at) return 0;
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      }
      default:
        return 0;
    }
  });

  if (loading) return <p className="text-[15px] text-muted py-8">Loading...</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1>Promo Codes</h1>
          <p className="mt-1 text-[15px] text-muted">
            Create and manage promotional discount codes for purchases.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          {showCreate ? "Cancel" : "Create Code"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createCode} className="mt-4 card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[12px] font-semibold text-muted">Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                maxLength={30}
                required
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px] font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Launch week special"
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="text-[12px] font-semibold text-muted">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">
                Discount Value {discountType === "percentage" ? "(%)" : "($)"}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "20" : "15.00"}
                min="0.01"
                max={discountType === "percentage" ? "100" : undefined}
                step={discountType === "percentage" ? "1" : "0.01"}
                required
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min="1"
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Expires</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              />
            </div>
          </div>

          <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
            {creating ? "Creating..." : "Create Promo Code"}
          </button>
        </form>
      )}

      {/* Stats summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[13px] text-muted">Total Codes</p>
          <p className="text-[24px] font-semibold text-plum">{codes.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[13px] text-muted">Active</p>
          <p className="text-[24px] font-semibold text-violet">{codes.filter((c) => c.is_active).length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[13px] text-muted">Total Redemptions</p>
          <p className="text-[24px] font-semibold text-plum">{codes.reduce((sum, c) => sum + c.current_uses, 0)}</p>
        </div>
      </div>

      {/* Codes table */}
      <div className="mt-6">
        {codes.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <label className="text-[12px] font-semibold text-muted">Sort by</label>
            <select
              value={promoSort}
              onChange={(e) => setPromoSort(e.target.value as typeof promoSort)}
              className="rounded-[10px] border-border px-3 py-2 text-[14px]"
            >
              <option value="created">Created date</option>
              <option value="code">Code name</option>
              <option value="discount">Discount value</option>
              <option value="status">Status (active first)</option>
              <option value="expires">Expiration date</option>
            </select>
          </div>
        )}
        {codes.length === 0 ? (
          <p className="text-[15px] text-muted text-center py-8">
            No promo codes yet. Create your first one above.
          </p>
        ) : (
          <div className="rounded-[12px] border border-border bg-white overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_100px_90px_90px_80px_80px] gap-2 px-4 py-2 bg-lavender/30 text-[12px] font-semibold text-muted">
              <span>Code</span>
              <span>Type</span>
              <span>Value</span>
              <span>Uses</span>
              <span>Created</span>
              <span>Expires</span>
              <span>Status</span>
              <span></span>
            </div>
            {sortedCodes.map((code) => {
              const expired = code.expires_at && new Date(code.expires_at) < new Date();
              const maxed = code.max_uses !== null && code.current_uses >= code.max_uses;
              const isInactive = !code.is_active || expired;

              return (
                <div
                  key={code.id}
                  className="grid grid-cols-[1fr_80px_80px_100px_90px_90px_80px_80px] gap-2 px-4 py-3 border-t border-border items-center"
                  style={isInactive ? { opacity: 0.55 } : undefined}
                >
                  <div>
                    <span className="font-mono text-[15px] font-semibold text-plum">{code.code}</span>
                    {code.description && (
                      <p className="text-[12px] text-muted mt-0.5">{code.description}</p>
                    )}
                  </div>
                  <span className="text-[13px] text-muted">
                    {code.discount_type === "percentage" ? "%" : "$"}
                  </span>
                  <span className="text-[15px] font-semibold text-plum">
                    {code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}
                  </span>
                  <span className="text-[13px] text-muted">
                    {code.current_uses}{code.max_uses !== null ? ` / ${code.max_uses}` : ""}{" "}
                    {maxed && <span className="text-error text-[11px]">(maxed)</span>}
                  </span>
                  <span className="text-[12px] text-muted">
                    {new Date(code.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-[12px] text-muted">
                    {code.expires_at
                      ? expired
                        ? new Date(code.expires_at).toLocaleDateString()
                        : new Date(code.expires_at).toLocaleDateString()
                      : "--"}
                  </span>
                  <span>
                    {expired ? (
                      <span className="badge text-[11px] bg-rose-100 text-rose-600">Expired</span>
                    ) : code.is_active ? (
                      <span className="badge-confirmed text-[11px]">Active</span>
                    ) : (
                      <span className="badge text-[11px] bg-whisper text-muted">Inactive</span>
                    )}
                  </span>
                  <button
                    onClick={() => toggleActive(code.id, !code.is_active)}
                    className="text-[12px] text-violet hover:text-soft-violet font-semibold"
                  >
                    {code.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
