"use client";

import { DayOfPlan } from "./types";

interface VendorsTabProps {
  plan: DayOfPlan;
}

export function VendorsTab({ plan }: VendorsTabProps) {
  return (
    <div className="mt-4 space-y-6">
      {plan.vendorContacts.length > 0 && (
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
                {plan.vendorContacts.map((v, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-semibold text-plum">{v.vendor}</td>
                    <td className="px-4 py-2 text-muted">{v.category}</td>
                    <td className="px-4 py-2 text-muted">{v.contact || "\u2014"}</td>
                    <td className="px-4 py-2 text-muted">{v.phone || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {plan.partyAssignments.length > 0 && (
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
                {plan.partyAssignments.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-semibold text-plum">{p.name}</td>
                    <td className="px-4 py-2 text-muted">{p.role}</td>
                    <td className="px-4 py-2 text-muted">{p.job || "\u2014"}</td>
                    <td className="px-4 py-2 text-muted">{p.phone || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {plan.vendorContacts.length === 0 && plan.partyAssignments.length === 0 && (
        <p className="text-[15px] text-muted text-center py-8">
          Add vendors and wedding party members to see them here.
        </p>
      )}
    </div>
  );
}
