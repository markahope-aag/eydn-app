"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SkeletonGrid } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trackMoodBoardAdd } from "@/lib/analytics";
import { Tooltip } from "@/components/Tooltip";

type MoodItem = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string;
  location: string | null;
  vendor_id: string | null;
  created_at: string;
};

type Vendor = { id: string; name: string; category: string };

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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [weddingSlug, setWeddingSlug] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/mood-board").then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : [];
      }),
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/weddings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([moodData, vendorData, weddingData]) => {
        setItems(moodData);
        setVendors(vendorData);
        if (weddingData?.website_slug) setWeddingSlug(weddingData.website_slug);
      })
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
        body: JSON.stringify({ image_url: imageUrl.trim(), caption: caption.trim() || null, category: showCustomCat && customCategory.trim() ? customCategory.trim() : category, location: location || null, vendor_id: vendorId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image didn't save. Try again.");
      setItems((prev) => [data, ...prev]);
      setImageUrl("");
      setCaption("");
      setLocation("");
      setVendorId("");
      setShowCustomCat(false);
      setCustomCategory("");
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
        body: JSON.stringify({ image_url: file_url, caption: caption.trim() || null, category: showCustomCat && customCategory.trim() ? customCategory.trim() : category, location: location || null, vendor_id: vendorId || null }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setItems((prev) => [saved, ...prev]);
      setCaption("");
      setLocation("");
      setVendorId("");
      setShowCustomCat(false);
      setCustomCategory("");
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

  async function updateVendor(id: string, newVendorId: string | null) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, vendor_id: newVendorId } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: newVendorId }),
    }).catch((err) => console.error("Failed to save vendor", err));
  }

  function shareBoard() {
    // Copy a summary to clipboard
    const catCounts = new Map<string, number>();
    for (const item of items) catCounts.set(item.category, (catCounts.get(item.category) || 0) + 1);
    const summary = `Check out my wedding vision board! ${items.length} pins across ${catCounts.size} categories.`;

    if (weddingSlug) {
      const url = `${window.location.origin}/w/${weddingSlug}`;
      navigator.clipboard.writeText(`${summary}\n${url}`);
      toast.success("Board link copied to clipboard");
    } else {
      navigator.clipboard.writeText(summary);
      toast.success("Board summary copied — set up your wedding website to share a link");
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileRef.current) {
        fileRef.current.files = dt.files;
        addFromUpload();
      }
    }
  }

  const allCategories = [...new Set([...CATEGORIES, ...items.map((i) => i.category)])];
  const categories = ["All", ...new Set(items.map((i) => i.category))];
  const filtered = filterCategory === "All" ? items : items.filter((i) => i.category === filterCategory);

  if (loading) return <SkeletonGrid count={6} cols={3} />;

  if (noWedding) return <NoWeddingState feature="Vision Board" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1>Vision Board</h1>
          <p className="mt-1 text-[15px] text-muted">
            Collect inspiration for your wedding look and feel
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button onClick={shareBoard} className="btn-secondary btn-sm inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5 7L8 4L11 7M8 4V11M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Share
            </button>
          )}
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
            {showAdd ? "Cancel" : "Add Inspiration"}
          </button>
        </div>
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
              <p className="text-[11px] text-muted mt-1">Works with Pinterest, Instagram, and most image links. For best results, right-click an image and copy the image address.</p>
            </div>
          )}

          {addMode === "upload" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={addFromUpload}
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`mt-1 flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-[16px] cursor-pointer transition ${
                  dragOver ? "border-violet bg-lavender/40" : "border-border hover:border-violet/50 hover:bg-lavender/20"
                }`}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 text-muted" aria-hidden="true">
                  <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 22L11 16L15 20L21 13L28 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[13px] font-semibold text-plum">Drop an image here or click to browse</p>
                <p className="text-[11px] text-muted mt-1">JPG, PNG, WebP up to 5MB</p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <label className="text-[12px] font-semibold text-muted">Board / Category <Tooltip text="Organize your pins into boards. Use the built-in categories or create your own like 'Cocktail Hour' or 'Favors'." wide /></label>
              {showCustomCat ? (
                <div className="mt-1 flex gap-1">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Cocktail Hour Decor"
                    className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px]"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowCustomCat(false)} className="text-[11px] text-muted hover:text-plum px-2">Cancel</button>
                </div>
              ) : (
                <div className="mt-1 flex gap-1">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px]"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowCustomCat(true)} className="text-[11px] text-violet font-semibold hover:text-plum px-2 whitespace-nowrap" title="Create a new board">+ New</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Where in your venue? <Tooltip text="Where in your venue would this look go? Helps you plan decor placement room by room." /></label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              >
                <option value="">Not specified</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted">Link to vendor (optional) <Tooltip text="Tag this image to a vendor in your list — great for sharing inspiration with your florist, decorator, or photographer." wide /></label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
              >
                <option value="">No vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={addMode === "url" ? addFromUrl : () => { if (addMode === "upload" && fileRef.current?.files?.length) addFromUpload(); }}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Top row — category/location badges + delete */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                  <div className="flex gap-1 flex-wrap">
                    <span className="bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-plum px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    {item.location && (
                      <span className="bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-violet px-2 py-0.5 rounded-full">
                        {item.location}
                      </span>
                    )}
                    {item.vendor_id && (() => {
                      const v = vendors.find((vn) => vn.id === item.vendor_id);
                      return v ? (
                        <span className="bg-violet/80 backdrop-blur-sm text-[10px] font-semibold text-white px-2 py-0.5 rounded-full">
                          {v.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(item.id); }}
                    className="w-6 h-6 bg-black/40 hover:bg-error text-white rounded-full text-[11px] flex items-center justify-center transition flex-shrink-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                {/* Bottom row — caption + edit hint */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {item.caption && (
                    <p className="text-[12px] text-white font-semibold leading-tight">{item.caption}</p>
                  )}
                  <p className="text-[10px] text-white/60 mt-1">Click to edit details</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <p className="text-[15px] text-muted text-center py-12">
          No items in this category yet.
        </p>
      ) : (
        <div className="mt-8 text-center">
          {/* Placeholder grid to set expectations */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8 opacity-30">
            {[120, 160, 100, 140, 110, 150].map((h, i) => (
              <div key={i} className="bg-lavender rounded-[12px]" style={{ height: h }} />
            ))}
          </div>
          <p className="text-[18px] font-semibold text-plum">Start building your vision</p>
          <p className="mt-2 text-[15px] text-muted max-w-md mx-auto">
            Add your first inspiration image — flowers, venues, decor, anything! Upload photos or paste URLs from Pinterest, Instagram, or anywhere.
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
                  <label className="text-[11px] font-semibold text-muted uppercase">Board / Category</label>
                  <select
                    defaultValue={lightbox.category}
                    onChange={(e) => { updateCategory(lightbox.id, e.target.value); setLightbox({ ...lightbox, category: e.target.value }); }}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted uppercase">Where in your venue?</label>
                  <select
                    defaultValue={lightbox.location || ""}
                    onChange={(e) => { const val = e.target.value || null; updateLocation(lightbox.id, val); setLightbox({ ...lightbox, location: val }); }}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  >
                    <option value="">Not specified</option>
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              {vendors.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-muted uppercase">Linked Vendor</label>
                  <select
                    defaultValue={lightbox.vendor_id || ""}
                    onChange={(e) => { const val = e.target.value || null; updateVendor(lightbox.id, val); setLightbox({ ...lightbox, vendor_id: val }); }}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  >
                    <option value="">No vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <p className="text-[12px] text-muted">
                  Added {new Date(lightbox.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => { setConfirmDelete(lightbox.id); }}
                  className="text-[12px] text-muted hover:text-error transition font-semibold"
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
