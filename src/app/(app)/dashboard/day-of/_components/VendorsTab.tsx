"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Pulls live vendor and wedding-party data rather than the snapshot baked
// into the day-of plan — so removed vendors no longer linger here.
type VendorRow = {
  id: string;
  name: string;
  category: string;
  poc_name: string | null;
  poc_phone: string | null;
  meal_count: number | null;
  arrival_time: string | null;
};

type PartyRow = {
  id: string;
  name: string;
  role: string;
  job_assignment: string | null;
  phone: string | null;
};

type GuestRow = {
  id: string;
  rsvp_status: string | null;
  plus_one_name: string | null;
};

export function VendorsTab() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [party, setParty] = useState<PartyRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/wedding-party").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/guests").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([v, p, g]) => {
        setVendors(Array.isArray(v) ? v : []);
        setParty(Array.isArray(p) ? p : []);
        setGuests(Array.isArray(g) ? g : []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Final meal count for the caterer = accepted guests + their plus-ones
  // who are actually coming + every vendor meal they've asked for.
  const acceptedGuests = guests.filter((g) => g.rsvp_status === "accepted").length;
  const plusOnesComing = guests.filter(
    (g) => g.rsvp_status === "accepted" && (g.plus_one_name?.trim() ?? "") !== ""
  ).length;
  const vendorMeals = vendors.reduce(
    (sum, v) => sum + (v.meal_count ?? 0),
    0
  );
  const guestMeals = acceptedGuests + plusOnesComing;
  const totalMeals = guestMeals + vendorMeals;

  return (
    <div className="mt-4 space-y-6">
      {/* Final meal count for the caterer */}
      {totalMeals > 0 && (
        <div className="rounded-[16px] border border-violet/30 bg-lavender/40 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet">
                Final meal count for catering
              </p>
              <p className="mt-1 text-[36px] font-semibold text-plum leading-none">
                {totalMeals.toLocaleString()}
              </p>
            </div>
            <p className="text-[12px] text-muted text-right max-w-[180px]">
              Give this number to your caterer. Includes guests, plus-ones,
              and vendor meals.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[10px] bg-white/70 px-3 py-2">
              <p className="text-[20px] font-semibold text-plum leading-none">
                {acceptedGuests}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Accepted {acceptedGuests === 1 ? "guest" : "guests"}
              </p>
            </div>
            <div className="rounded-[10px] bg-white/70 px-3 py-2">
              <p className="text-[20px] font-semibold text-plum leading-none">
                {plusOnesComing}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Plus-{plusOnesComing === 1 ? "one" : "ones"} coming
              </p>
            </div>
            <div className="rounded-[10px] bg-white/70 px-3 py-2">
              <p className="text-[20px] font-semibold text-plum leading-none">
                {vendorMeals}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Vendor {vendorMeals === 1 ? "meal" : "meals"}
              </p>
            </div>
          </div>
          {acceptedGuests === 0 && (
            <p className="mt-3 text-[12px] text-muted">
              Numbers will fill in as guests RSVP.
            </p>
          )}
        </div>
      )}

      {vendors.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-plum mb-3">Vendor Contacts</h2>
          <div className="overflow-hidden rounded-[16px] border border-border bg-white">
            <table className="w-full text-[15px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Vendor</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Category</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Arrival</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Contact</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 font-semibold text-plum">{v.name}</td>
                    <td className="px-4 py-2 text-muted">{v.category}</td>
                    <td className="px-4 py-2 text-muted">{v.arrival_time || "—"}</td>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-plum">Wedding Party Jobs</h2>
            <Link
              href="/dashboard/wedding-party"
              className="text-[13px] font-semibold text-violet hover:text-soft-violet"
            >
              Assign jobs →
            </Link>
          </div>
          {/* Members appear here regardless, but day-of jobs are set on the
              Wedding Party page — guide the couple there when none are assigned
              so an all-"—" table doesn't read as broken. */}
          {party.every((p) => (p.job_assignment ?? "").trim() === "") && (
            <p className="mb-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
              No day-of jobs assigned yet. Open{" "}
              <Link href="/dashboard/wedding-party" className="font-semibold underline">
                Wedding Party
              </Link>{" "}
              to give each person a role (processional, gift table, toasts…) and
              it&apos;ll show here for your coordinator.
            </p>
          )}
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
