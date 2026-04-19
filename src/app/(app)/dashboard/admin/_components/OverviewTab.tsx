"use client";

import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { Stats, AnalyticsData } from "./types";

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="card p-6">
      <p className="text-[15px] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-plum">{value}</p>
      {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
    </div>
  );
}

export default function OverviewTab({
  stats,
  analyticsData,
}: {
  stats: Stats;
  analyticsData: AnalyticsData | null;
}) {
  const recentSignups = analyticsData?.dailySignups?.slice(-14) || [];
  const recentWAU = analyticsData?.weeklyActive?.slice(-6) || [];

  return (
    <div className="mt-6 space-y-6">
      {/* Key metrics with sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-[13px] text-muted">Total Subscribers</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{stats.total_subscribers.toLocaleString()}</p>
          <p className="text-[12px] text-muted mt-1">{stats.new_signups_7d} new this week</p>
          {recentSignups.length > 2 && (
            <div className="mt-2 h-[40px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentSignups}>
                  <Line type="monotone" dataKey="count" stroke="#2C3E2D" strokeWidth={2} dot={false} />
                  <RechartsTooltip content={() => null} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Active Users (7d)</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{stats.active_users_7d.toLocaleString()}</p>
          <p className="text-[12px] text-muted mt-1">{stats.total_subscribers > 0 ? Math.round((stats.active_users_7d / stats.total_subscribers) * 100) : 0}% of subscribers</p>
          {recentWAU.length > 2 && (
            <div className="mt-2 h-[40px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentWAU}>
                  <Bar dataKey="count" fill="#D4A5A5" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Conversion Rate</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{stats.paid_conversion_rate}%</p>
          <p className="text-[12px] text-muted mt-1">Trial &rarr; Paid subscriber</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Onboarding Completed</p>
          <p className="mt-1 text-[28px] font-bold text-plum">{stats.onboarding_completed.toLocaleString()}</p>
          <p className="text-[12px] text-muted mt-1">{stats.total_subscribers > 0 ? Math.round((stats.onboarding_completed / stats.total_subscribers) * 100) : 0}% completion rate</p>
        </div>
      </div>

      {/* Subscription Funnel */}
      <div className="card p-5">
        <h2 className="text-[15px] font-semibold text-plum mb-3">Subscription Funnel</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="bg-emerald-50 rounded-[12px] p-4 text-center">
            <p className="text-[12px] font-semibold text-emerald-700">Active Trials</p>
            <p className="text-[28px] font-bold text-emerald-700 mt-1">{stats.trials_active}</p>
            <p className="text-[11px] text-emerald-600 mt-1">Within 14-day window</p>
          </div>
          <div className="bg-amber-50 rounded-[12px] p-4 text-center">
            <p className="text-[12px] font-semibold text-amber-700">Expired (No Purchase)</p>
            <p className="text-[28px] font-bold text-amber-700 mt-1">{stats.trials_expired_unconverted}</p>
            <p className="text-[11px] text-amber-600 mt-1">Trial ended without converting</p>
          </div>
          <div className="bg-violet/10 rounded-[12px] p-4 text-center">
            <p className="text-[12px] font-semibold text-violet">Paid Subscriptions</p>
            <p className="text-[28px] font-bold text-violet mt-1">{stats.paid_subscriptions}</p>
            <p className="text-[11px] text-muted mt-1">{stats.paid_conversion_rate}% of weddings converted</p>
          </div>
        </div>
      </div>

      {/* Post-Wedding Retention */}
      {stats.post_wedding_total > 0 && (
        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-plum mb-3">Post-Wedding Retention</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="bg-violet/10 rounded-[12px] p-4 text-center">
              <p className="text-[12px] font-semibold text-violet">Memory Plan Active</p>
              <p className="text-[28px] font-bold text-violet mt-1">{stats.memory_plan_active}</p>
              <p className="text-[11px] text-muted mt-1">$29/yr recurring</p>
            </div>
            <div className="bg-whisper rounded-[12px] p-4 text-center">
              <p className="text-[12px] font-semibold text-muted">Expired / No Plan</p>
              <p className="text-[28px] font-bold text-muted mt-1">{stats.post_wedding_expired}</p>
              <p className="text-[11px] text-muted mt-1">Account winding down</p>
            </div>
            <div className="bg-lavender rounded-[12px] p-4 text-center">
              <p className="text-[12px] font-semibold text-plum">Retention Rate</p>
              <p className="text-[28px] font-bold text-plum mt-1">
                {Math.round((stats.memory_plan_active / stats.post_wedding_total) * 100)}%
              </p>
              <p className="text-[11px] text-muted mt-1">of {stats.post_wedding_total} post-wedding couples</p>
            </div>
          </div>
        </div>
      )}

      {/* Secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Weddings" value={stats.total_events} subtitle="Events in system" />
        <StatCard label="AI Chat Messages" value={stats.total_ai_chats.toLocaleString()} subtitle="Eydn conversations" />
        <StatCard
          label="Onboarding Funnel"
          value={analyticsData?.funnel ? `${analyticsData.funnel.completedOnboarding} / ${analyticsData.funnel.signedUp}` : "\u2014"}
          subtitle={analyticsData?.funnel ? `${analyticsData.funnel.addedFirstVendor} added a vendor, ${analyticsData.funnel.addedFirstGuest} added a guest` : "Loading..."}
        />
      </div>

      {/* Feature adoption quick view */}
      {analyticsData?.featureAdoption && analyticsData.featureAdoption.length > 0 && (
        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-plum mb-3">Feature Adoption</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analyticsData.featureAdoption.slice(0, 9).map((f) => (
              <div key={f.feature} className="flex items-center justify-between bg-lavender/30 rounded-[10px] px-3 py-2">
                <span className="text-[13px] text-plum">{f.feature}</span>
                <span className="text-[13px] font-semibold text-violet">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
