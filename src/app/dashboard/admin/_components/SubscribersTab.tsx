"use client";

import { useState } from "react";
import type { User } from "./types";

export default function SubscribersTab({
  users,
  onUpdateRole,
}: {
  users: User[];
  onUpdateRole: (userId: string, role: string) => void;
}) {
  const [subSearch, setSubSearch] = useState("");
  const [subFilter, setSubFilter] = useState<"all" | "active" | "no-event" | "admin">("all");
  const [subSort, setSubSort] = useState<{ key: "joined" | "last_sign_in"; dir: "asc" | "desc" }>({ key: "joined", dir: "desc" });

  const filtered = users
    .filter((u) => {
      if (subSearch) {
        const q = subSearch.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (subFilter === "active") return u.has_event;
      if (subFilter === "no-event") return !u.has_event;
      if (subFilter === "admin") return u.role === "admin";
      return true;
    })
    .sort((a, b) => {
      const aVal = a[subSort.key] || 0;
      const bVal = b[subSort.key] || 0;
      return subSort.dir === "desc" ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });

  const noNameCount = users.filter((u) => u.name === "\u2014").length;

  function toggleSort(key: "joined" | "last_sign_in") {
    setSubSort((prev) => prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }

  const sortArrow = (key: "joined" | "last_sign_in") =>
    subSort.key === key ? (subSort.dir === "desc" ? " \u2193" : " \u2191") : "";

  return (
    <div className="mt-6">
      {/* Search and filter bar */}
      <div className="flex gap-3 items-center flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={subSearch}
            onChange={(e) => setSubSearch(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-white pl-11 pr-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>
        <select
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value as typeof subFilter)}
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
        >
          <option value="all">All ({users.length})</option>
          <option value="active">Active ({users.filter((u) => u.has_event).length})</option>
          <option value="no-event">No event ({users.filter((u) => !u.has_event).length})</option>
          <option value="admin">Admins ({users.filter((u) => u.role === "admin").length})</option>
        </select>
        <span className="text-[13px] text-muted">{filtered.length} shown</span>
      </div>

      {noNameCount > 0 && (
        <div className="mb-4 rounded-[10px] bg-amber-50 border border-amber-200 px-4 py-2 text-[13px] text-amber-800">
          {noNameCount} subscriber{noNameCount > 1 ? "s have" : " has"} no name set. Require first/last name in your <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Clerk dashboard</a> under User &amp; Authentication &rarr; Email, Phone, Username &rarr; Name (toggle to Required).
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-[15px] text-muted py-8 text-center">
          {users.length === 0 ? "No subscribers yet." : "No subscribers match your search."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border-border bg-white">
          <table className="w-full text-[15px]">
            <thead className="border-b border-border bg-lavender">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted cursor-pointer hover:text-plum select-none" onClick={() => toggleSort("joined")}>
                  Joined{sortArrow("joined")}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted cursor-pointer hover:text-plum select-none" onClick={() => toggleSort("last_sign_in")}>
                  Last Active{sortArrow("last_sign_in")}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-4 py-3 font-semibold text-plum">
                    {user.name === "\u2014" ? <span className="text-amber-500 italic">No name</span> : user.name}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.has_event ? (
                      <span className="badge badge-confirmed">Active</span>
                    ) : (
                      <span className="badge badge-pending">No event</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(user.joined).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {user.last_sign_in
                      ? new Date(user.last_sign_in).toLocaleDateString()
                      : <span className="text-muted/50">Never</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => onUpdateRole(user.user_id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-[12px] font-semibold border-0 ${
                        user.role === "admin"
                          ? "bg-lavender text-violet"
                          : "bg-lavender text-muted"
                      }`}
                    >
                      <option value="user">Subscriber</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
