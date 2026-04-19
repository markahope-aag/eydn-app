"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  source: string;
  discount_code_sent: boolean;
  created_at: string;
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/waitlist")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setEntries)
      .catch(() => toast.error("Failed to load waitlist"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[15px] text-muted py-8">Loading...</p>;

  const sentCount = entries.filter((e) => e.discount_code_sent).length;

  return (
    <div className="max-w-4xl">
      <h1>Waitlist</h1>
      <p className="mt-1 text-[15px] text-muted">
        People who signed up after the beta was full. Each received a 20% discount code.
      </p>

      {/* Stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[13px] text-muted">Total Signups</p>
          <p className="text-[24px] font-semibold text-plum">{entries.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[13px] text-muted">Discount Codes Sent</p>
          <p className="text-[24px] font-semibold text-violet">{sentCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-[13px] text-muted">Pending Email</p>
          <p className="text-[24px] font-semibold text-plum">{entries.length - sentCount}</p>
        </div>
      </div>

      {/* List */}
      {entries.length === 0 ? (
        <p className="text-[15px] text-muted text-center py-12">
          No waitlist signups yet. Share your beta page to start collecting interest.
        </p>
      ) : (
        <div className="mt-6 rounded-[12px] border border-border bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_100px_120px] gap-2 px-4 py-2 bg-lavender/30 text-[12px] font-semibold text-muted">
            <span>Name</span>
            <span>Email</span>
            <span>Code Sent</span>
            <span>Signed Up</span>
          </div>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[1fr_1fr_100px_120px] gap-2 px-4 py-3 border-t border-border items-center"
            >
              <span className="text-[15px] font-semibold text-plum">{entry.name}</span>
              <a href={`mailto:${entry.email}`} className="text-[14px] text-violet hover:text-soft-violet truncate">
                {entry.email}
              </a>
              <span>
                {entry.discount_code_sent ? (
                  <span className="badge-confirmed text-[11px]">Sent</span>
                ) : (
                  <span className="badge text-[11px] bg-whisper text-muted">Pending</span>
                )}
              </span>
              <span className="text-[12px] text-muted">
                {new Date(entry.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      {entries.length > 0 && (
        <div className="mt-4 text-right">
          <button
            onClick={() => {
              const csv = "Name,Email,Code Sent,Signed Up\n" +
                entries.map((e) =>
                  `"${e.name}","${e.email}",${e.discount_code_sent},${new Date(e.created_at).toLocaleDateString()}`
                ).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "eydn-waitlist.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Waitlist exported");
            }}
            className="btn-secondary btn-sm"
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
