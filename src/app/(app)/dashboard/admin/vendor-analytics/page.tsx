"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "@/components/charts/lazy-recharts";

const COLORS = ["#2C3E2D", "#D4A5A5", "#C9A84C", "#E8D5B7", "#6B8E6B", "#B07D7D", "#A68A3C", "#D4C4A5"];

type VendorStats = {
  directory: {
    total: number;
    active: number;
    featured: number;
    byCategory: { category: string; count: number }[];
    byState: { state: string; count: number }[];
    byPriceRange: { range: string; count: number }[];
  };
  usage: {
    totalBookings: number;
    byCategory: { category: string; count: number }[];
    topVendorNames: { name: string; category: string; count: number }[];
    byStatus: { status: string; count: number }[];
    averagePerWedding: number;
  };
  accounts: {
    total: number;
    pending: number;
    approved: number;
    suspended: number;
  };
  placements: {
    activePlacements: number;
    mrr: number;
    byTier: { tier: string; count: number; revenue: number }[];
  };
  submissions: {
    pending: number;
    approved: number;
    rejected: number;
  };
};

export default function VendorAnalyticsPage() {
  const [data, setData] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/vendor-stats")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => toast.error("Failed to load vendor stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (forbidden) {
    return (
      <div className="max-w-lg">
        <h1>Access Denied</h1>
        <p className="mt-2 text-[15px] text-muted">You don&apos;t have admin access.</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[15px] text-muted py-8">Failed to load data.</p>;
  }

  const top10States = data.directory.byState.slice(0, 10);

  return (
    <div className="space-y-8">
      <h1>Vendor Insights</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-6">
          <p className="text-[13px] text-muted">Directory Vendors</p>
          <p className="mt-1 text-2xl font-semibold text-plum">{data.directory.total.toLocaleString()}</p>
          <p className="text-[12px] text-muted mt-1">{data.directory.active} active / {data.directory.featured} featured</p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] text-muted">Active Bookings</p>
          <p className="mt-1 text-2xl font-semibold text-plum">{data.usage.totalBookings.toLocaleString()}</p>
          <p className="text-[12px] text-muted mt-1">{data.usage.averagePerWedding} avg per wedding</p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] text-muted">Vendor Accounts</p>
          <p className="mt-1 text-2xl font-semibold text-plum">{data.accounts.total}</p>
          <p className="text-[12px] text-muted mt-1">{data.accounts.pending} pending</p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] text-muted">Active Placements</p>
          <p className="mt-1 text-2xl font-semibold text-plum">{data.placements.activePlacements}</p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] text-muted">Monthly Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-plum">${data.placements.mrr.toLocaleString()}</p>
        </div>
      </div>

      {/* Directory by Category */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Directory by Category</h2>
        <ResponsiveContainer width="100%" height={Math.max(300, data.directory.byCategory.length * 36)}>
          <BarChart data={data.directory.byCategory} layout="vertical" margin={{ left: 200, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="category" width={190} tick={{ fontSize: 13 }} interval={0} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#2C3E2D" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Directory by Region */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Directory by Region (Top 10)</h2>
        <ResponsiveContainer width="100%" height={Math.max(300, top10States.length * 36)}>
          <BarChart data={top10States} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="state" width={70} tick={{ fontSize: 13 }} interval={0} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#D4A5A5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Most Booked Vendors */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Most Booked Vendors (Top 20)</h2>
        {data.usage.topVendorNames.length === 0 ? (
          <p className="text-[15px] text-muted py-4 text-center">No booking data yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-border bg-white">
            <table className="w-full text-[15px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Vendor Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.usage.topVendorNames.map((v, i) => (
                  <tr key={`${v.name}-${v.category}`}>
                    <td className="px-4 py-3 text-muted">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-plum">{v.name}</td>
                    <td className="px-4 py-3 text-muted">{v.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-violet">{v.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Pipeline & Price Range */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-plum mb-4">Booking Pipeline</h2>
          {data.usage.byStatus.length === 0 ? (
            <p className="text-[15px] text-muted py-4 text-center">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.usage.byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {data.usage.byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-plum mb-4">Price Range Distribution</h2>
          {data.directory.byPriceRange.length === 0 ? (
            <p className="text-[15px] text-muted py-4 text-center">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.directory.byPriceRange}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {data.directory.byPriceRange.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Submissions */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Vendor Submissions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[12px] bg-amber-50 p-4 text-center">
            <p className="text-[13px] text-amber-700">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-amber-800">{data.submissions.pending}</p>
          </div>
          <div className="rounded-[12px] bg-emerald-50 p-4 text-center">
            <p className="text-[13px] text-emerald-700">Approved</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-800">{data.submissions.approved}</p>
          </div>
          <div className="rounded-[12px] bg-red-50 p-4 text-center">
            <p className="text-[13px] text-red-700">Rejected</p>
            <p className="mt-1 text-2xl font-semibold text-red-800">{data.submissions.rejected}</p>
          </div>
        </div>
      </div>

      {/* Revenue by Tier */}
      {data.placements.byTier.length > 0 && (
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold text-plum mb-4">Revenue by Tier</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.placements.byTier.map((t) => (
              <div key={t.tier} className="rounded-[12px] border border-border p-4">
                <p className="text-[15px] font-semibold text-violet">{t.tier}</p>
                <p className="text-[13px] text-muted mt-1">{t.count} active</p>
                <p className="mt-2 text-xl font-semibold text-plum">${t.revenue.toLocaleString()}/mo</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
