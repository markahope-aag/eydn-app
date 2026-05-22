"use client";

import { useState, useEffect } from "react";

// Pulls live vendor and wedding-party data rather than the snapshot baked
// into the day-of plan — so removed vendors no longer linger here.
type VendorRow = {
  id: string;
  name: string;
  category: string;
  poc_name: string | null;
  poc_phone: string | null;
};

type PartyRow = {
  id: string;
  name: string;
  role: string;
  job_assignment: string | null;
  phone: string | null;
};

export function VendorsTab() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [party, setParty] = useState<PartyRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/wedding-party").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, p]) => {
        setVendors(Array.isArray(v) ? v : []);
        setParty(Array.isArray(p) ? p : []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="mt-4 space-y-6">
      {vendors.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-plum mb-3">Vendor Contacts</h2>
          <div className="overflow-hidden rounded-[16px] border border-border bg-white">
            <table className="w-full text-[15px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Vendor</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Category</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Contact</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 font-semibold text-plum">{v.name}</td>
                    <td className="px-4 py-2 text-muted">{v.category}</td>
                    <td className="px-4 py-2 text-muted">{v.poc_name || "—"}</td>
                    <td className="px-4 py-2 text-muted">{v.poc_phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {party.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-plum mb-3">Wedding Party Jobs</h2>
          <div className="overflow-hidden rounded-[16px] border border-border bg-white">
            <table className="w-full text-[15px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Role</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Job</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {party.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-semibold text-plum">{p.name}</td>
                    <td className="px-4 py-2 text-muted">{p.role}</td>
                    <td className="px-4 py-2 text-muted">{p.job_assignment || "—"}</td>
                    <td className="px-4 py-2 text-muted">{p.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loaded && vendors.length === 0 && party.length === 0 && (
        <p className="text-[15px] text-muted text-center py-8">
          Add vendors and wedding party members to see them here.
        </p>
      )}
    </div>
  );
}
