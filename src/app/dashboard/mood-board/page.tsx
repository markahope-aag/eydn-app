"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SkeletonGrid } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trackMoodBoardAdd } from "@/lib/analytics";

type MoodItem = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string;
  location: string | null;
  created_at: string;
};

const LOCATIONS = [
  "Ceremony",
  "Reception",
  "Cocktail Hour",
  "Bar",
  "Entrance",
  "Dessert Table",
  "Sweetheart Table",
  "Photo Booth",
  "Other",
];

const CATEGORIES = [
  "General",
  "Ceremony",
  "Reception",
  "Florals",
  "Table Settings",
  "Lighting",
  "Attire",
  "Hair & Makeup",
  "Cake & Desserts",
  "Stationery",
  "Colors & Palette",
  "Photo Inspo",
  "Favors",
  "Other",
];

export default function MoodBoardPage() {
  const [items, setItems] = useState<MoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noWedding, setNoWedding] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("General");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<MoodItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/mood-board")
      .then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : [];
      })
      .then(setItems)
      .catch(() => toast.error("Couldn't load your vision board. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  async function addFromUrl() {
    if (!imageUrl.trim()) return;
    setUploading(true);
    try {
      const res = await fetch("/api/mood-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl.trim(), caption: caption.trim() || null, category, location: location || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image didn't save. Try again.");
      setItems((prev) => [data, ...prev]);
      setImageUrl("");
      setCaption("");
      setLocation("");
      setShowAdd(false);
      trackMoodBoardAdd();
      toast.success("Saved to vision board");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image didn't save. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function addFromUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", "task");
    formData.append("entity_id", "mood-board");

    try {
      const uploadRes = await fetch("/api/attachments", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (${uploadRes.status})`);
      }
      const { file_url } = await uploadRes.json();

      const res = await fetch("/api/mood-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: file_url, caption: caption.trim() || null, category, location: location || null }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setItems((prev) => [saved, ...prev]);
      setCaption("");
      setLocation("");
      setShowAdd(false);
      trackMoodBoardAdd();
      toast.success("Saved to vision board");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image didn't upload. Try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeItem(id: string) {
    const prev = items;
    setItems((i) => i.filter((x) => x.id !== id));
    try {
      await fetch(`/api/mood-board/${id}`, { method: "DELETE" });
    } catch {
      setItems(prev);
      toast.error("Couldn't remove that. Try again.");
    }
  }

  async function updateCaption(id: string, newCaption: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, caption: newCaption || null } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: newCaption || null }),
    }).catch((err) => console.error("Failed to save caption", err));
  }

  async function updateCategory(id: string, newCategory: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category: newCategory } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    }).catch((err) => console.error("Failed to save category", err));
  }

  async function updateLocation(id: string, newLocation: string | null) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, location: newLocation } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: newLocation }),
    }).catch((err) => console.error("Failed to save location", err));
  }

  const categories = ["All", ...new Set(items.map((i) => i.category))];
  const filtered = filterCategory === "All" ? items : items.filter((i) => i.category === filterCategory);

  if (loading) return <SkeletonGrid count={6} cols={3} />;

  if (noWedding) return <NoWeddingState feature="Vision Board" />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1>Vision Board</h1>
          <p className="mt-1 text-[15px] text-muted">
            Collect inspiration for your wedding look and feel
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          {showAdd ? "Cancel" : "Add Inspiration"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mt-4 card p-5 space-y-4">
          <div className="flex gap-1">
            <button
              onClick={() => setAddMode("upload")}
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition ${
                addMode === "upload" ? "bg-violet text-white" : "bg-lavender text-violet"
              }`}
            >
              Upload Image
            </button>
            <button
              onClick={() => setAddMode("url")}
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition ${
                addMode === "url" ? "bg-violet text-white" : "bg-lavender text-violet"
              }`}
            >
              Paste URL
            </button>
          </div>

          {addMode === "url" && (
            <div>
              <label className="text-[12px] font-semibold text-muted">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              />
            </div>
          )}

          {addMode === "upload" && (
            <div>
              <label className="text-[12px] font-semibold text-muted">Choose Image</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="mt-1 block text-[14px] text-muted file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-lavender file:text-violet hover:file:bg-violet hover:file:text-white file:transition file:cursor-pointer"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[12px] font-semibold text-muted">Caption (optional)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Love this centerpiece style"
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Location (optional)</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              >
                <option value="">None</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={addMode === "url" ? addFromUrl : addFromUpload}
            disabled={uploading || (addMode === "url" && !imageUrl.trim())}
            className="btn-primary disabled:opacity-50"
          >
            {uploading ? "Adding..." : "Add to Board"}
          </button>
        </div>
      )}

      {/* Category filters */}
      {items.length > 0 && (
        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-3 py-1.5 text-[13px] font-semibold rounded-full whitespace-nowrap transition ${
                filterCategory === c
                  ? "bg-violet text-white"
                  : "bg-lavender text-violet hover:bg-violet hover:text-white"
              }`}
            >
              {c}
              {c !== "All" && (
                <span className="ml-1 opacity-70">
                  {items.filter((i) => i.category === c).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Masonry grid */}
      {filtered.length > 0 ? (
        <div className="mt-6 columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid group relative rounded-[16px] overflow-hidden bg-white border border-border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLightbox(item)}
            >
              <Image
                src={item.image_url}
                alt={item.caption || "Inspiration"}
                className="w-full object-cover"
                unoptimized
                width={400}
                height={400}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {item.caption && (
                    <p className="text-[13px] text-white font-semibold">{item.caption}</p>
                  )}
                  <p className="text-[11px] text-white/70 mt-0.5">
                    {item.category}
                    {item.location && <span> &middot; {item.location}</span>}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(item.id); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-error text-white rounded-full text-[12px] flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                >
                  &times;
                </button>
              </div>
              {/* Category & location badges */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <span className="bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-plum px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
                {item.location && (
                  <span className="bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-violet px-2 py-0.5 rounded-full">
                    {item.location}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <p className="text-[15px] text-muted text-center py-12">
          No items in this category yet.
        </p>
      ) : (
        <div className="text-center py-16">
          <p className="text-[18px] font-semibold text-plum">Start building your vision</p>
          <p className="mt-2 text-[15px] text-muted max-w-md mx-auto">
            Upload photos or paste image URLs from anywhere to collect inspiration for your wedding decor, florals, attire, colors, and more.
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-6">
            Add Your First Pin
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-[20px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1 min-h-0">
              <Image
                src={lightbox.image_url}
                alt={lightbox.caption || "Inspiration"}
                className="w-full max-h-[60vh] object-contain bg-black/5"
                unoptimized
                width={800}
                height={600}
              />
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white text-plum rounded-full text-[18px] flex items-center justify-center shadow transition"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted uppercase">Caption</label>
                <input
                  type="text"
                  defaultValue={lightbox.caption || ""}
                  onBlur={(e) => updateCaption(lightbox.id, e.target.value)}
                  placeholder="Add a caption..."
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted uppercase">Category</label>
                  <select
                    defaultValue={lightbox.category}
                    onChange={(e) => { updateCategory(lightbox.id, e.target.value); setLightbox({ ...lightbox, category: e.target.value }); }}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted uppercase">Location</label>
                  <select
                    defaultValue={lightbox.location || ""}
                    onChange={(e) => { const val = e.target.value || null; updateLocation(lightbox.id, val); setLightbox({ ...lightbox, location: val }); }}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  >
                    <option value="">None</option>
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-[12px] text-muted">
                  Added {new Date(lightbox.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => { setConfirmDelete(lightbox.id); }}
                  className="text-[13px] text-error hover:opacity-80 font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove from vision board?"
        message="This image will be permanently removed from your vision board. This action cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmDelete) {
            removeItem(confirmDelete);
            if (lightbox?.id === confirmDelete) setLightbox(null);
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
