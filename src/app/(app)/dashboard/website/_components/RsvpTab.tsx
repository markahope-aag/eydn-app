"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tooltip } from "@/components/Tooltip";

type RsvpToken = {
  id: string;
  token: string;
  responded: boolean;
  responded_at: string | null;
  guests: { name: string; email: string | null; rsvp_status: string; meal_preference: string | null; plus_one_name: string | null };
};

interface RsvpTabProps {
  slug: string;
  rsvpTokens: RsvpToken[];
  loadRsvpTokens: () => void;
  rsvpDeadline: string;
  setRsvpDeadline: (deadline: string) => void;
  mealOptions: string[];
  setMealOptions: (options: string[]) => void;
  autoSave: (fields: Record<string, unknown>, debounceMs?: number) => void;
}

export function RsvpTab({
  slug,
  rsvpTokens,
  loadRsvpTokens,
  rsvpDeadline,
  setRsvpDeadline,
  mealOptions,
  setMealOptions,
  autoSave,
}: RsvpTabProps) {
  const [generatingTokens, setGeneratingTokens] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<{ guestId: string; guestName: string; qrUrl: string }[]>([]);
  const [newMealOption, setNewMealOption] = useState("");

  async function generateRsvpTokens() {
    setGeneratingTokens(true);
    try {
      const res = await fetch("/api/wedding-website/rsvp", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(data.message);
      loadRsvpTokens();
    } catch {
      toast.error("Couldn't generate RSVP links. Try again.");
    } finally {
      setGeneratingTokens(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Link copied");
  }

  return (
    <div className="space-y-6">
      <div className="max-w-lg space-y-6">
        <div>
          <label className="text-[13px] font-semibold text-muted block mb-1">
            RSVP Deadline <Tooltip text="Guests will see this deadline on your RSVP page. Set it 2-4 weeks before the wedding to give your caterer final numbers." wide />
          </label>
          <input
            type="date"
            value={rsvpDeadline}
            onChange={(e) => {
              setRsvpDeadline(e.target.value);
              autoSave({ rsvp_deadline: e.target.value });
            }}
            className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>

        <div>
          <h3 className="text-[15px] font-semibold text-plum mb-3">Meal Options</h3>
          <p className="text-[12px] text-muted mb-3">
            Define the meal choices guests will see when they RSVP.
          </p>
          {mealOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {mealOptions.map((option, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-lavender px-3 py-1 text-[13px] text-violet font-medium"
                >
                  {option}
                  <button
                    onClick={() => {
                      const updated = mealOptions.filter((_, j) => j !== i);
                      setMealOptions(updated);
                      autoSave({ meal_options: updated }, 2000);
                    }}
                    className="ml-1 text-violet/60 hover:text-red-500 transition"
                    aria-label={`Remove ${option}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMealOption}
              onChange={(e) => setNewMealOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMealOption.trim()) {
                  e.preventDefault();
                  const updated = [...mealOptions, newMealOption.trim()];
                  setMealOptions(updated);
                  setNewMealOption("");
                  autoSave({ meal_options: updated }, 2000);
                }
              }}
              placeholder="Add a meal option..."
              className="flex-1 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
            />
            <button
              onClick={() => {
                if (newMealOption.trim()) {
                  const updated = [...mealOptions, newMealOption.trim()];
                  setMealOptions(updated);
                  setNewMealOption("");
                  autoSave({ meal_options: updated }, 2000);
                }
              }}
              className="btn-primary btn-sm"
            >
              Add
            </button>
          </div>
          {mealOptions.length === 0 && (
            <div className="mt-3">
              <p className="text-[12px] text-muted mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {["Chicken", "Fish", "Vegetarian", "Vegan"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      const updated = [...mealOptions, opt];
                      setMealOptions(updated);
                      autoSave({ meal_options: updated }, 2000);
                    }}
                    className="rounded-full border border-violet/30 bg-lavender/50 px-3 py-1 text-[13px] text-violet hover:bg-lavender transition"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex items-center gap-4">
        <button
          onClick={generateRsvpTokens}
          disabled={generatingTokens}
          className="btn-primary"
        >
          {generatingTokens ? "Generating..." : "Generate RSVP Links"}
        </button>
        <p className="text-[13px] text-muted">
          Creates unique RSVP links for all guests who don&apos;t have one yet <Tooltip text="Each guest gets a unique link they can use to RSVP, select a meal preference, and add a plus-one. Responses update your guest list automatically." wide />
        </p>
      </div>

      {/* QR Codes for Physical Invitations */}
      {rsvpTokens.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-plum">QR Codes for Invitations</h3>
            <button
              onClick={async () => {
                setQrGenerating(true);
                try {
                  const res = await fetch("/api/wedding-website/qr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bulk: true }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error || "Failed");
                  const data = await res.json();
                  setQrCodes(data.results || []);
                  toast.success(`Generated ${data.generated} QR codes`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "QR generation failed");
                } finally {
                  setQrGenerating(false);
                }
              }}
              disabled={qrGenerating}
              className="btn-primary btn-sm disabled:opacity-50"
            >
              {qrGenerating ? "Generating..." : qrCodes.length > 0 ? "Regenerate All" : "Generate QR Codes"}
            </button>
          </div>
          <div className="bg-lavender/30 rounded-[12px] p-4 text-[13px] text-muted space-y-2">
            <p className="font-semibold text-plum">How to use QR codes on your invitations:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click &quot;Generate QR Codes&quot; to create a unique QR code for each guest</li>
              <li>Download individual QR images or the full ZIP file</li>
              <li>Send the QR image files to your invitation designer or print shop</li>
              <li>Each guest&apos;s invite gets their unique QR code printed on it</li>
              <li>When a guest scans their QR code, they land directly on their personalized RSVP page — no codes to type, no names to search</li>
            </ol>
            <p className="text-[12px] mt-2">Each QR code is unique to one guest. Do not mix them up — the wrong QR on the wrong invite means the wrong person RSVPs.</p>
          </div>
          {qrCodes.length > 0 && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const JSZip = (await import("jszip")).default;
                    const zip = new JSZip();
                    for (const qr of qrCodes) {
                      try {
                        const res = await fetch(qr.qrUrl);
                        const blob = await res.blob();
                        const safeName = qr.guestName.replace(/[^a-zA-Z0-9]/g, "-");
                        zip.file(`${safeName}-RSVP-QR.png`, blob);
                      } catch { /* skip failed downloads */ }
                    }
                    const content = await zip.generateAsync({ type: "blob" });
                    const url = URL.createObjectURL(content);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "rsvp-qr-codes.zip";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("QR codes downloaded");
                  }}
                  className="btn-secondary btn-sm"
                >
                  Download All as ZIP
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {qrCodes.map((qr) => (
                  <div key={qr.guestId} className="card p-3 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr.qrUrl} alt={`QR for ${qr.guestName}`} className="w-full aspect-square object-contain" />
                    <p className="text-[13px] font-semibold text-plum mt-2 truncate">{qr.guestName}</p>
                    <a href={qr.qrUrl} download={`${qr.guestName.replace(/[^a-zA-Z0-9]/g, "-")}-RSVP-QR.png`} className="text-[11px] text-violet hover:text-plum mt-1 inline-block">
                      Download PNG
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {rsvpTokens.length > 0 ? (
        <div className="card-list">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[13px] font-semibold text-muted py-3 px-4">Guest</th>
                <th className="text-left text-[13px] font-semibold text-muted py-3 px-4">Status</th>
                <th className="text-left text-[13px] font-semibold text-muted py-3 px-4">Meal</th>
                <th className="text-left text-[13px] font-semibold text-muted py-3 px-4">RSVP Link</th>
                <th className="text-right text-[13px] font-semibold text-muted py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {rsvpTokens.map((t) => {
                const guest = t.guests as unknown as RsvpToken["guests"];
                const link = `${window.location.origin}/w/${slug}?rsvp=${t.token}`;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-[15px] text-plum">{guest?.name ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge text-[12px] ${
                          t.responded
                            ? guest?.rsvp_status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : guest?.rsvp_status === "declined"
                              ? "bg-red-100 text-red-700"
                              : "bg-lavender text-violet"
                            : "bg-gray-100 text-muted"
                        }`}
                      >
                        {t.responded ? guest?.rsvp_status ?? "responded" : "pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted">
                      {guest?.meal_preference || "—"}
                    </td>
                    <td className="py-3 px-4 text-[12px] text-muted max-w-[200px] truncate">
                      {link}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => copyToClipboard(link)}
                        className="btn-ghost btn-sm text-violet"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[15px] text-muted">
          No RSVP tokens generated yet. Click the button above to create links for your guests.
        </p>
      )}
    </div>
  );
}
