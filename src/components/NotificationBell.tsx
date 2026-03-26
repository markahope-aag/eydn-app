"use client";

import { useState, useEffect, useRef } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then(setNotifications)
      .catch((e) => console.error("[fetch] notifications", e));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await fetch(`/api/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    for (const id of unreadIds) {
      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      }).catch(() => {});
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1 text-muted hover:text-plum"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-violet text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-[16px] border-border shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-[15px] font-semibold text-plum">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[12px] text-violet hover:text-soft-violet"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-[15px] text-muted text-center">
                No notifications
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 hover:bg-lavender border-b border-border last:border-0 ${
                  !n.read ? "bg-lavender/50" : ""
                }`}
              >
                <p className="text-[15px] font-semibold text-plum">{n.title}</p>
                {n.body && (
                  <p className="text-[12px] text-muted mt-0.5">{n.body}</p>
                )}
                <p className="text-[10px] text-muted mt-1">
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
