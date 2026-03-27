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
  LineChart,
  Line,
} from "recharts";

type AnalyticsData = {
  dailySignups: { date: string; count: number }[];
  weeklyActive: { week: string; count: number }[];
  funnel: {
    signedUp: number;
    startedOnboarding: number;
    completedOnboarding: number;
    addedFirstVendor: number;
    addedFirstGuest: number;
  };
  featureAdoption: { feature: string; count: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => toast.error("Failed to load analytics"))
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

  const funnelData = [
    { stage: "Signed Up", count: data.funnel.signedUp },
    { stage: "Started Onboarding", count: data.funnel.startedOnboarding },
    { stage: "Completed Onboarding", count: data.funnel.completedOnboarding },
    { stage: "Added First Vendor", count: data.funnel.addedFirstVendor },
    { stage: "Added First Guest", count: data.funnel.addedFirstGuest },
  ];

  return (
    <div className="space-y-8">
      <h1>Analytics</h1>

      {/* Daily Signups */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Daily Signups (Last 90 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailySignups}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={6}
            />
            <YAxis allowDecimals={false} />
            <RechartsTooltip
              labelFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return d.toLocaleDateString();
              }}
            />
            <Line type="monotone" dataKey="count" stroke="#2C3E2D" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Active Users */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Weekly Active Users (Last 12 Weeks)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.weeklyActive}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis allowDecimals={false} />
            <RechartsTooltip
              labelFormatter={(v) => `Week of ${new Date(v + "T00:00:00").toLocaleDateString()}`}
            />
            <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Onboarding Funnel */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Onboarding Funnel</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 140 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 13 }} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#D4A5A5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {data.funnel.signedUp > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-4 text-center">
            <div>
              <p className="text-[12px] text-muted">Onboarding Start Rate</p>
              <p className="text-[15px] font-semibold text-violet">
                {Math.round((data.funnel.startedOnboarding / data.funnel.signedUp) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted">Onboarding Completion</p>
              <p className="text-[15px] font-semibold text-violet">
                {Math.round((data.funnel.completedOnboarding / data.funnel.signedUp) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted">Added Vendor</p>
              <p className="text-[15px] font-semibold text-violet">
                {Math.round((data.funnel.addedFirstVendor / data.funnel.signedUp) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted">Added Guest</p>
              <p className="text-[15px] font-semibold text-violet">
                {Math.round((data.funnel.addedFirstGuest / data.funnel.signedUp) * 100)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feature Adoption */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Feature Adoption</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.featureAdoption} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="feature" width={110} tick={{ fontSize: 13 }} />
            <RechartsTooltip formatter={(value) => [`${value} weddings`, "Using"]} />
            <Bar dataKey="count" fill="#2C3E2D" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
