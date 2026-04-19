"use client";

import { useState } from "react";
import { toast } from "sonner";

type RegistryLink = { id: string; name: string; url: string; sort_order: number };

interface RegistryTabProps {
  registryLinks: RegistryLink[];
  loadRegistry: () => void;
}

export function RegistryTab({ registryLinks, loadRegistry }: RegistryTabProps) {
  const [newRegistryName, setNewRegistryName] = useState("");
  const [newRegistryUrl, setNewRegistryUrl] = useState("");

  async function addRegistryLink() {
    if (!newRegistryName || !newRegistryUrl) return;
    try {
      const res = await fetch("/api/wedding-website/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRegistryName, url: newRegistryUrl }),
      });
      if (!res.ok) throw new Error();
      setNewRegistryName("");
      setNewRegistryUrl("");
      loadRegistry();
      toast.success("Registry link saved");
    } catch {
      toast.error("Couldn't add that link. Try again.");
    }
  }

  async function removeRegistryLink(id: string) {
    try {
      const res = await fetch(`/api/wedding-website/registry?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      loadRegistry();
      toast.success("Registry link removed");
    } catch {
      toast.error("Couldn't remove that. Try again.");
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-3">
        {registryLinks.map((link) => (
          <div key={link.id} className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold text-plum">{link.name}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-violet hover:underline"
              >
                {link.url}
              </a>
            </div>
            <button
              onClick={() => removeRegistryLink(link.id)}
              className="btn-ghost btn-sm text-red-500"
            >
              Remove
            </button>
          </div>
        ))}

        {registryLinks.length === 0 && (
          <p className="text-[15px] text-muted">No registry links yet. Add one below.</p>
        )}
      </div>

      <p className="text-[12px] text-muted italic">
        Tip: It&apos;s thoughtful to include a brief note to guests about your registry preferences on your website.
      </p>

      <div className="card p-4 space-y-3">
        <h3 className="text-[15px] font-semibold text-plum">Add Registry Link</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "Amazon Wedding Registry", icon: "🅰️" },
            { name: "Zola", icon: "💍" },
            { name: "Target", icon: "🎯" },
            { name: "Crate & Barrel", icon: "🏠" },
            { name: "Honeyfund", icon: "✈️" },
          ].map((r) => (
            <button
              key={r.name}
              onClick={() => setNewRegistryName(r.name)}
              className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-medium transition inline-flex items-center gap-1.5 ${
                newRegistryName === r.name
                  ? "border-violet bg-lavender text-violet"
                  : "border-border bg-white text-plum hover:border-violet/40 hover:bg-lavender/30"
              }`}
            >
              <span className="text-[14px]">{r.icon}</span>
              {r.name}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={newRegistryName}
          onChange={(e) => setNewRegistryName(e.target.value)}
          placeholder="Registry name (e.g. Amazon, Zola)"
          className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <input
          type="url"
          value={newRegistryUrl}
          onChange={(e) => setNewRegistryUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <button onClick={addRegistryLink} className="btn-primary btn-sm">
          Add Link
        </button>
      </div>
    </div>
  );
}
