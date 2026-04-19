"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type ConnectionInfo = {
  configured: boolean;
  status?: string;
};

type IntegrationsData = {
  ai: {
    totalMessages: number;
    messagesLast7d: number;
    messagesLast30d: number;
    uniqueWeddingsUsing: number;
    averagePerWedding: number;
  };
  connections: Record<string, ConnectionInfo>;
  emailHealth: {
    sentLast7d: number;
    bouncesLast7d: number;
    complaintsLast7d: number;
    deliveryRate: number;
  };
};

const CONNECTION_META: { key: string; name: string; description: string }[] = [
  { key: "supabase", name: "Supabase", description: "Database" },
  { key: "clerk", name: "Clerk", description: "Authentication" },
  { key: "anthropic", name: "Anthropic", description: "AI Chat" },
  { key: "resend", name: "Resend", description: "Email" },
  { key: "stripe", name: "Stripe", description: "Payments" },
  { key: "twilio", name: "Twilio", description: "SMS" },
  { key: "googlePlaces", name: "Google Places", description: "Vendor Data" },
  { key: "sentry", name: "Sentry", description: "Error Monitoring" },
  { key: "vapid", name: "VAPID", description: "Push Notifications" },
];

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => toast.error("Failed to load integrations data"))
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

  return (
    <div className="space-y-8">
      <h1>AI &amp; Integrations</h1>

      {/* External Connections Grid */}
      <section>
        <h2 className="text-[15px] font-semibold text-plum mb-4">External Connections</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONNECTION_META.map(({ key, name, description }) => {
            const conn = data.connections[key];
            const configured = conn?.configured ?? false;
            return (
              <div key={key} className="card p-4 flex items-center gap-3">
                <span
                  className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                    configured ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div>
                  <p className="text-[15px] font-semibold text-plum">{name}</p>
                  <p className="text-[13px] text-muted">{description}</p>
                  <p className={`text-[12px] font-medium mt-0.5 ${configured ? "text-green-700" : "text-red-600"}`}>
                    {configured ? "Connected" : "Not configured"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Chat Usage */}
      <section>
        <h2 className="text-[15px] font-semibold text-plum mb-4">AI Chat Usage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Messages" value={data.ai.totalMessages.toLocaleString()} />
          <StatCard label="Messages (7d)" value={data.ai.messagesLast7d.toLocaleString()} />
          <StatCard label="Messages (30d)" value={data.ai.messagesLast30d.toLocaleString()} />
          <StatCard label="Weddings Using AI" value={data.ai.uniqueWeddingsUsing.toLocaleString()} />
          <StatCard label="Avg per Wedding" value={data.ai.averagePerWedding.toLocaleString()} />
        </div>
      </section>

      {/* Email Delivery Health */}
      <section>
        <h2 className="text-[15px] font-semibold text-plum mb-4">Email Delivery Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Emails Sent (7d)" value={data.emailHealth.sentLast7d.toLocaleString()} />
          <StatCard
            label="Bounces (7d)"
            value={data.emailHealth.bouncesLast7d.toLocaleString()}
            warn={data.emailHealth.bouncesLast7d > 0}
          />
          <StatCard
            label="Complaints (7d)"
            value={data.emailHealth.complaintsLast7d.toLocaleString()}
            warn={data.emailHealth.complaintsLast7d > 0}
          />
          <StatCard
            label="Delivery Rate"
            value={`${data.emailHealth.deliveryRate}%`}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`card p-4 ${warn ? "border-amber-400 border-2" : ""}`}>
      <p className="text-[12px] text-muted">{label}</p>
      <p className={`text-[22px] font-semibold mt-1 ${warn ? "text-amber-600" : "text-violet"}`}>
        {value}
      </p>
      {warn && (
        <p className="text-[11px] text-amber-600 font-medium mt-1">Needs attention</p>
      )}
    </div>
  );
}
