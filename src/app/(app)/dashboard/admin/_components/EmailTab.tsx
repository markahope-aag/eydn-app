"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { EmailData } from "./types";

function AutoLoadEmail({ load }: { load: () => void }) {
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function EmailTab({
  emailData,
  emailLoading,
  onLoad,
}: {
  emailData: EmailData | null;
  emailLoading: boolean;
  onLoad: () => void;
}) {
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailType, setTestEmailType] = useState("post_wedding_welcome");
  const [sendingTest, setSendingTest] = useState(false);
  const [testSmsTo, setTestSmsTo] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingPush, setSendingPush] = useState(false);

  return (
    <div className="mt-6 space-y-8">
      <AutoLoadEmail load={onLoad} />
      {emailLoading && <p className="text-[15px] text-muted py-8">Loading communications data...</p>}

      {emailData && (
        <>
          {/* Config Status */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Email Configuration</h2>
            <div className="mt-3 flex gap-4">
              <div className="card p-4 flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${emailData.config.resendConfigured ? "bg-green-500" : "bg-red-500"}`} />
                <div>
                  <p className="text-[15px] font-semibold text-plum">
                    Resend {emailData.config.resendConfigured ? "Connected" : "Not Configured"}
                  </p>
                  <p className="text-[12px] text-muted">From: {emailData.config.fromEmail}</p>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-[15px] font-semibold text-plum">{emailData.totalSent}</p>
                <p className="text-[12px] text-muted">Lifecycle emails sent</p>
              </div>
            </div>
          </div>

          {/* Communications Status */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Communications Status</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div className="card p-4 flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${emailData.pushConfig.configured ? "bg-green-500" : "bg-red-500"}`} />
                <div>
                  <p className="text-[15px] font-semibold text-plum">
                    Push Notifications {emailData.pushConfig.configured ? "Active" : "Not Configured"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {emailData.pushConfig.subscriptionCount} subscription{emailData.pushConfig.subscriptionCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${emailData.smsConfig.configured ? "bg-green-500" : "bg-red-500"}`} />
                <div>
                  <p className="text-[15px] font-semibold text-plum">
                    SMS (Twilio) {emailData.smsConfig.configured ? "Active" : "Not Configured"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {emailData.smsConfig.fromNumber ? `From: ${emailData.smsConfig.fromNumber}` : "No from number set"}
                  </p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${emailData.trackingConfig.configured ? "bg-green-500" : "bg-red-500"}`} />
                <div>
                  <p className="text-[15px] font-semibold text-plum">
                    Email Tracking {emailData.trackingConfig.configured ? "Active" : "Not Configured"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {emailData.trackingConfig.totalEvents} tracked event{emailData.trackingConfig.totalEvents !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Send Test Email */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Send Test Email</h2>
            <p className="mt-1 text-[13px] text-muted">Preview any email template by sending a test to yourself.</p>
            <div className="mt-3 flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-muted">Recipient</label>
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Template</label>
                <select
                  value={testEmailType}
                  onChange={(e) => setTestEmailType(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                >
                  {emailData.emailTypes.map((et) => (
                    <option key={et.type} value={et.type}>{et.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!testEmailTo) { toast.error("Enter a recipient email"); return; }
                  setSendingTest(true);
                  try {
                    const res = await fetch("/api/admin/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ to: testEmailTo, templateType: testEmailType }),
                    });
                    const data = await res.json();
                    if (data.success) toast.success("Test email sent!");
                    else toast.error(data.error || "Failed to send");
                  } catch { toast.error("Failed to send test email"); }
                  finally { setSendingTest(false); }
                }}
                disabled={sendingTest || !testEmailTo}
                className="btn-primary disabled:opacity-50"
              >
                {sendingTest ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>

          {/* Test SMS */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Test SMS</h2>
            <p className="mt-1 text-[13px] text-muted">Send a test SMS via Twilio to verify your configuration.</p>
            <div className="mt-3 flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-muted">Phone Number</label>
                <input
                  type="tel"
                  value={testSmsTo}
                  onChange={(e) => setTestSmsTo(e.target.value)}
                  placeholder="+1234567890"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </div>
              <button
                onClick={async () => {
                  if (!testSmsTo) { toast.error("Enter a phone number"); return; }
                  setSendingSms(true);
                  try {
                    const res = await fetch("/api/admin/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "test_sms", to: testSmsTo, message: "Test SMS from Eydn admin" }),
                    });
                    const data = await res.json();
                    if (data.success) toast.success("Test SMS sent!");
                    else toast.error(data.error || "Failed to send SMS");
                  } catch { toast.error("Failed to send test SMS"); }
                  finally { setSendingSms(false); }
                }}
                disabled={sendingSms || !testSmsTo}
                className="btn-primary disabled:opacity-50"
              >
                {sendingSms ? "Sending..." : "Send Test SMS"}
              </button>
            </div>
          </div>

          {/* Test Push */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Test Push Notification</h2>
            <p className="mt-1 text-[13px] text-muted">Send a test push notification to all subscriptions on your wedding.</p>
            <div className="mt-3">
              <button
                onClick={async () => {
                  setSendingPush(true);
                  try {
                    const res = await fetch("/api/admin/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "test_push" }),
                    });
                    const data = await res.json();
                    if (data.success) toast.success(`Test push sent to ${data.sent}/${data.total} subscriptions`);
                    else toast.error(data.error || "Failed to send push");
                  } catch { toast.error("Failed to send test push"); }
                  finally { setSendingPush(false); }
                }}
                disabled={sendingPush}
                className="btn-primary disabled:opacity-50"
              >
                {sendingPush ? "Sending..." : "Send Test Push"}
              </button>
            </div>
          </div>

          {/* Notification Stats */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Notification Stats</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div className="card p-4">
                <p className="text-[15px] font-semibold text-plum">{emailData.notificationStats.total}</p>
                <p className="text-[12px] text-muted">Total notifications</p>
              </div>
              <div className="card p-4">
                <p className="text-[15px] font-semibold text-plum">{emailData.notificationStats.unread}</p>
                <p className="text-[12px] text-muted">Unread</p>
              </div>
              <div className="card p-4">
                <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">By Type</p>
                <div className="mt-2 space-y-1">
                  {Object.keys(emailData.notificationStats.byType).length > 0 ? (
                    Object.entries(emailData.notificationStats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-[13px]">
                        <span className="text-muted">{type.replace(/_/g, " ")}</span>
                        <span className="font-semibold text-plum">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-muted">No notifications yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Email Types & Stats */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Email Templates</h2>
            <div className="mt-3 overflow-x-auto rounded-[16px] border border-border bg-white">
              <table className="w-full text-[14px]">
                <thead className="border-b border-border bg-lavender">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Template</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Trigger</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {emailData.emailTypes.map((et) => (
                    <tr key={et.type}>
                      <td className="px-4 py-3 font-semibold text-plum">{et.label}</td>
                      <td className="px-4 py-3 text-muted">{et.trigger}</td>
                      <td className="px-4 py-3 text-right font-semibold text-plum">{et.sent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sends */}
          <div>
            <h2 className="text-[18px] font-semibold text-plum">Recent Sends</h2>
            {emailData.recentEmails.length > 0 ? (
              <div className="mt-3 space-y-1">
                {emailData.recentEmails.map((e, i) => (
                  <div key={i} className="card-list flex items-center gap-3 px-4 py-2">
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-lavender text-violet">
                      {e.email_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[13px] text-muted flex-1 truncate">
                      Wedding: {e.wedding_id.slice(0, 8)}...
                    </span>
                    <span className="text-[12px] text-muted">
                      {new Date(e.sent_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[15px] text-muted">No emails sent yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
