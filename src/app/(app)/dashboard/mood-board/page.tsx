"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SkeletonGrid } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trackMoodBoardAdd } from "@/lib/analytics";
import { Tooltip } from "@/components/Tooltip";
import { GuideLink } from "@/components/GuideLink";

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

// Personalized starting points shown on the empty board. Each label matches a
// CATEGORIES value so it pre-selects the board when the add form opens.
const SUGGESTED_CATEGORIES: { label: string; icon: string }[] = [
  { label: "Florals", icon: "💐" },
  { label: "Reception", icon: "🥂" },
  { label: "Ceremony", icon: "💍" },
  { label: "Attire", icon: "👗" },
  { label: "Cake & Desserts", icon: "🍰" },
  { label: "Table Settings", icon: "🍽️" },
  { label: "Colors & Palette", icon: "🎨" },
  { label: "Photo Inspo", icon: "📷" },
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
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [weddingSlug, setWeddingSlug] = useState<string | null>(null);
  const [websitePublished, setWebsitePublished] = useState(false);
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
        setWebsitePublished(Boolean(weddingData?.website_enabled));
      })
      .catch(() => toast.error("Couldn't load your vision board. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  /**
   * Build the shared form payload that every item in a batch carries.
   * caption/category/location/vendor are intentionally applied to every
   * item — couples typically batch-add things that share the same
   * tagging ("20 ceremony arch ideas") and editing each one after the
   * fact is busywork.
   */
  function buildSharedPayload() {
    return {
      caption: caption.trim() || null,
      category: showCustomCat && customCategory.trim() ? customCategory.trim() : category,
      location: location || null,
      vendor_id: vendorId || null,
    };
  }

  function clearAddForm() {
    setImageUrl("");
    setCaption("");
    setLocation("");
    setVendorId("");
    setShowCustomCat(false);
    setCustomCategory("");
    setShowAdd(false);
    setPendingFiles([]);
  }

  /**
   * Save one image_url into mood-board. Returns the saved item or throws.
   * Centralizes the per-item POST so both the URL and upload paths reuse it.
   */
  async function saveOneItem(image_url: string) {
    const res = await fetch("/api/mood-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url, ...buildSharedPayload() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Image didn't save");
    return data;
  }

  async function addFromUrl() {
    // Multi-URL: accept newline-separated URLs so couples can paste a list
    // of pin links at once. Filter out blank lines and trim whitespace.
    const urls = imageUrl
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    setUploading(true);
    let successes = 0;
    let failures = 0;
    let lastError = "";
    const toastId = urls.length > 1 ? toast.loading(`Saving 1 of ${urls.length}…`) : undefined;

    try {
      for (let i = 0; i < urls.length; i++) {
        if (toastId !== undefined) {
          toast.loading(`Saving ${i + 1} of ${urls.length}…`, { id: toastId });
        }
        try {
          const saved = await saveOneItem(urls[i]);
          setItems((prev) => [saved, ...prev]);
          trackMoodBoardAdd();
          successes++;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "";
          failures++;
        }
      }

      if (toastId !== undefined) toast.dismiss(toastId);

      if (successes > 0 && failures === 0) {
        toast.success(
          successes === 1 ? "Saved to vision board" : `${successes} images added`
        );
        clearAddForm();
      } else if (successes > 0 && failures > 0) {
        toast(`${successes} added · ${failures} couldn't be saved`);
        clearAddForm();
      } else {
        toast.error(lastError || "Couldn't save those URLs. Check the links and try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function addFromUpload() {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return;
    setUploading(true);

    let successes = 0;
    let failures = 0;
    let lastError = "";
    const toastId = files.length > 1 ? toast.loading(`Uploading 1 of ${files.length}…`) : undefined;

    try {
      for (let i = 0; i < files.length; i++) {
        if (toastId !== undefined) {
          toast.loading(`Uploading ${i + 1} of ${files.length}…`, { id: toastId });
        }
        try {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("entity_type", "task");
          formData.append("entity_id", "mood-board");

          const uploadRes = await fetch("/api/attachments", { method: "POST", body: formData });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.error || `Upload failed (${uploadRes.status})`);
          }
          const { file_url } = await uploadRes.json();
          const saved = await saveOneItem(file_url);
          setItems((prev) => [saved, ...prev]);
          trackMoodBoardAdd();
          successes++;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "";
          failures++;
        }
      }

      if (toastId !== undefined) toast.dismiss(toastId);

      if (successes > 0 && failures === 0) {
        toast.success(
          successes === 1 ? "Saved to vision board" : `${successes} images added`
        );
        clearAddForm();
      } else if (successes > 0 && failures > 0) {
        toast(`${successes} uploaded · ${failures} couldn't be saved`);
        clearAddForm();
      } else {
        toast.error(lastError || "Upload failed. Try again.");
      }
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
    }).catch(() => toast.error("Couldn't save the caption. Try again."));
  }

  async function updateCategory(id: string, newCategory: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category: newCategory } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    }).catch(() => toast.error("Couldn't update the category. Try again."));
  }

  async function updateLocation(id: string, newLocation: string | null) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, location: newLocation } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: newLocation }),
    }).catch(() => toast.error("Couldn't save the location. Try again."));
  }

  async function updateVendor(id: string, newVendorId: string | null) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, vendor_id: newVendorId } : i)));
    await fetch(`/api/mood-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: newVendorId }),
    }).catch(() => toast.error("Couldn't link that vendor. Try again."));
  }

  function shareBoard() {
    const catCounts = new Map<string, number>();
    for (const item of items) catCounts.set(item.category, (catCounts.get(item.category) || 0) + 1);
    const summary = `Check out our wedding vision board — ${items.length} pins across ${catCounts.size} categories.`;

    if (weddingSlug && websitePublished) {
      const url = `${window.location.origin}/w/${weddingSlug}/vision`;
      navigator.clipboard.writeText(`${summary}\n${url}`);
      toast.success("Vision board link copied to clipboard");
    } else if (weddingSlug && !websitePublished) {
      navigator.clipboard.writeText(summary);
      toast("Summary copied — publish your wedding website to share a public link");
    } else {
      navigator.clipboard.writeText(summary);
      toast.success("Board summary copied — set up your wedding website to share a link");
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (dropped.length === 0) return;
    const dt = new DataTransfer();
    for (const f of dropped) dt.items.add(f);
    if (fileRef.current) {
      fileRef.current.files = dt.files;
      setPendingFiles(dropped.map((f) => f.name));
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
            Collect inspiration for your wedding look and feel.{" "}
            <a
              href="https://pin.it/4f47esCnG"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-violet underline underline-offset-2 decoration-2 hover:text-soft-violet transition"
            >
              Need inspo? Browse our Pinterest
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Pulling your palette together? See the{" "}
            <GuideLink slug="colors-theme">colors &amp; theme guide</GuideLink>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <button onClick={shareBoard} className="btn-secondary btn-sm inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5 7L8 4L11 7M8 4V11M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Share
              </button>
              {!websitePublished && (
                <Tooltip
                  text="Publish your wedding website to share a public link your vendors can open. Until then, Share copies a summary you can paste into an email."
                  wide
                />
              )}
            </div>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className={showAdd || items.length === 0 ? "btn-secondary" : "btn-primary"}
          >
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
              <label className="text-[12px] font-semibold text-muted">Image URLs</label>
              <textarea
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={"https://...\nPaste one URL per line to add several at once"}
                rows={3}
                className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-y"
              />
              <p className="text-[11px] text-muted mt-1">Works with Pinterest, Instagram, and most image links. For best results, right-click an image and copy the image address. One URL per line to add several at once.</p>
            </div>
          )}

          {addMode === "upload" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  setPendingFiles(
                    Array.from(e.target.files ?? []).map((f) => f.name)
                  );
                }}
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
                <p className="text-[13px] font-semibold text-plum">
                  {pendingFiles.length > 0
                    ? pendingFiles.length === 1
                      ? `Ready: ${pendingFiles[0]}`
                      : `${pendingFiles.length} images ready`
                    : "Drop images here or click to browse"}
                </p>
                <p className="text-[11px] text-muted mt-1">
                  {pendingFiles.length > 0
                    ? "Set the board, caption, or vendor below, then click Add to Board."
                    : "JPG, PNG, WebP up to 10MB · select or drop several at once"}
                </p>
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
                  <button
                    type="button"
                    onClick={() => { setShowCustomCat(false); setCustomCategory(""); }}
                    className="text-[12px] text-muted hover:text-plum px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setShowCustomCat(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">+ Add your own…</option>
                </select>
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
              {/* Native img — we don't know each pasted/uploaded image's natural
                  dimensions, and the masonry only looks right when every image
                  renders at its own aspect ratio (so tall Pinterest pins stay
                  tall, landscape shots stay landscape, nothing crops). next/image
                  forces a fixed width/height which collapses everything into
                  squares. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.caption || "Inspiration"}
                className="w-full h-auto block"
                loading="lazy"
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
                    aria-label="Remove image"
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
        <div className="mt-6 max-w-2xl mx-auto">
          {/* Single primary action — an upload zone that also sets the
              expectation that you can drag, click, or paste to add images. */}
          <button
            type="button"
            onClick={() => { setAddMode("upload"); setShowAdd(true); }}
            className="group w-full flex flex-col items-center justify-center text-center py-12 px-6 border-2 border-dashed border-violet/30 rounded-[20px] bg-lavender/20 hover:border-violet/60 hover:bg-lavender/40 transition"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-violet/10 text-violet">
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 22L11 16L15 20L21 13L28 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="mt-4 text-[18px] font-semibold text-plum">Start your vision board</span>
            <span className="mt-2 text-[15px] text-muted max-w-md">
              Drag &amp; drop images here, click to upload, or paste a link from Pinterest or Instagram.
            </span>
            <span className="mt-5 inline-block rounded-full bg-violet text-white px-5 py-2 text-[14px] font-semibold group-hover:opacity-90 transition">
              Add your first image
            </span>
          </button>

          {/* Suggested starting points to help couples get going faster */}
          <p className="mt-8 text-center text-[12px] font-semibold uppercase tracking-wide text-muted">
            Or start with an idea
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SUGGESTED_CATEGORIES.map(({ label, icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setCategory(label); setAddMode("upload"); setShowAdd(true); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 text-[13px] text-plum hover:border-violet hover:bg-lavender/40 transition"
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </div>
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
                aria-label="Close preview"
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
                  {lightbox.vendor_id && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/board/${lightbox.vendor_id}`
                        );
                        toast.success("Vendor link copied — they'll see every post tagged to them, no login needed");
                      }}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-violet hover:text-soft-violet transition"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 10l4-4M7 4l1-1a3 3 0 014 4l-1 1M9 12l-1 1a3 3 0 01-4-4l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Copy this vendor&apos;s inspiration link
                    </button>
                  )}
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
