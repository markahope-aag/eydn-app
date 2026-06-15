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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [reordering, setReordering] = useState(false);

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

  function startEdit(link: RegistryLink) {
    setEditingId(link.id);
    setEditName(link.name);
    setEditUrl(link.url);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditUrl("");
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    const url = editUrl.trim();
    if (!name || !url) {
      toast.error("Name and URL are both required");
      return;
    }
    try {
      const res = await fetch("/api/wedding-website/registry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, url }),
      });
      if (!res.ok) throw new Error();
      cancelEdit();
      loadRegistry();
      toast.success("Registry link updated");
    } catch {
      toast.error("Couldn't save that change. Try again.");
    }
  }

  // Reorder by swapping a link's sort_order with its neighbour's, then reload.
  async function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (reordering || target < 0 || target >= registryLinks.length) return;
    const current = registryLinks[index];
    const neighbour = registryLinks[target];
    setReordering(true);
    try {
      const patch = (id: string, sort_order: number) =>
        fetch("/api/wedding-website/registry", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, sort_order }),
        });
      const [a, b] = await Promise.all([
        patch(current.id, neighbour.sort_order),
        patch(neighbour.id, current.sort_order),
      ]);
      if (!a.ok || !b.ok) throw new Error();
      loadRegistry();
    } catch {
      toast.error("Couldn't reorder. Try again.");
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-3">
        {registryLinks.map((link, index) =>
          editingId === link.id ? (
            <div key={link.id} className="card p-4 space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Edit registry name"
                placeholder="Registry name"
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                aria-label="Edit registry URL"
                placeholder="https://..."
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(link.id)} className="btn-primary btn-sm">
                  Save
                </button>
                <button onClick={cancelEdit} className="btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={link.id} className="card p-4 flex items-center gap-3">
              {/* Reorder controls */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveLink(index, -1)}
                  disabled={index === 0 || reordering}
                  aria-label={`Move ${link.name} up`}
                  className="text-muted hover:text-plum disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveLink(index, 1)}
                  disabled={index === registryLinks.length - 1 || reordering}
                  aria-label={`Move ${link.name} down`}
                  className="text-muted hover:text-plum disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                >
                  ▼
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-plum truncate">{link.name}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-violet hover:underline break-all"
                >
                  {link.url}
                </a>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(link)}
                  className="btn-ghost btn-sm text-violet"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeRegistryLink(link.id)}
                  className="btn-ghost btn-sm text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        )}

        {registryLinks.length === 0 && (
          <p className="text-[15px] text-muted">No registry links yet. Add one below.</p>
        )}
      </div>

      <p className="text-[12px] text-muted italic">
        Tip: It&apos;s thoughtful to include a brief note to guests about your registry preferences on your website.
      </p>

      <div className="card p-4 space-y-3">
        <h2 className="text-[15px] font-semibold text-plum">Add Registry Link</h2>
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
          aria-label="Registry name"
          className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <input
          type="url"
          value={newRegistryUrl}
          onChange={(e) => setNewRegistryUrl(e.target.value)}
          placeholder="https://..."
          aria-label="Registry URL"
          className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
        />
        <button onClick={addRegistryLink} className="btn-primary btn-sm">
          Add Link
        </button>
      </div>
    </div>
  );
}
