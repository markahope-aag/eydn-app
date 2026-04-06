"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { Tooltip } from "@/components/Tooltip";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trackWebsitePublished } from "@/lib/analytics";

type Tab = "setup" | "schedule" | "registry" | "rsvp" | "gallery";

type ScheduleItem = { time: string; event: string };
type FaqItem = { question: string; answer: string };
type RegistryLink = { id: string; name: string; url: string; sort_order: number };
type RsvpToken = {
  id: string;
  token: string;
  responded: boolean;
  responded_at: string | null;
  guests: { name: string; email: string | null; rsvp_status: string; meal_preference: string | null; plus_one_name: string | null };
};
type Photo = { id: string; file_url: string; caption: string | null; uploader_name: string | null; approved: boolean; created_at: string };

export default function WebsitePage() {
  const [tab, setTab] = useState<Tab>("setup");
  const [loading, setLoading] = useState(true);
  const [noWedding, setNoWedding] = useState(false);

  // Setup state
  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [showLaunchMoment, setShowLaunchMoment] = useState(false);
  const wasEnabledOnLoad = useRef(false);
  const [headline, setHeadline] = useState("");
  const [story, setStory] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Slug availability
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [travel, setTravel] = useState("");
  const [accommodations, setAccommodations] = useState("");
  const [faq, setFaq] = useState<FaqItem[]>([]);

  // Registry state
  const [registryLinks, setRegistryLinks] = useState<RegistryLink[]>([]);
  const [newRegistryName, setNewRegistryName] = useState("");
  const [newRegistryUrl, setNewRegistryUrl] = useState("");

  // RSVP state
  const [rsvpTokens, setRsvpTokens] = useState<RsvpToken[]>([]);
  const [generatingTokens, setGeneratingTokens] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<{ guestId: string; guestName: string; qrUrl: string }[]>([]);
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [mealOptions, setMealOptions] = useState<string[]>([]);
  const [newMealOption, setNewMealOption] = useState("");

  // Gallery state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoApprovalRequired, setPhotoApprovalRequired] = useState(false);

  // Couple photo
  const [couplePhotoUrl, setCouplePhotoUrl] = useState("");

  // Hero layout
  const [heroLayout, setHeroLayout] = useState<"fullscreen" | "side-by-side">("fullscreen");

  // Preview panel
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  function refreshPreview() {
    if (previewRef.current) {
      previewRef.current.src = previewRef.current.src;
    }
  }

  // Cover upload
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Couple photo upload
  const couplePhotoRef = useRef<HTMLInputElement>(null);
  const [uploadingCouplePhoto, setUploadingCouplePhoto] = useState(false);

  const originalSlug = useRef("");

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Schedule import state
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importItems, setImportItems] = useState<ScheduleItem[]>([]);

  // Auto-save function
  const autoSave = useCallback(
    (fields: Record<string, unknown>, debounceMs = 1500) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/wedding-website", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to save");
          }
          setSaveStatus("saved");
          savedFadeTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
          // Refresh preview iframe after save
          if (previewRef.current) previewRef.current.src = previewRef.current.src;
        } catch (err) {
          setSaveStatus("error");
          toast.error(err instanceof Error ? err.message : "Failed to save");
        }
      }, debounceMs);
    },
    []
  );

  // Immediate save (no debounce) for toggles
  const autoSaveImmediate = useCallback(
    (fields: Record<string, unknown>) => {
      autoSave(fields, 0);
    },
    [autoSave]
  );

  useEffect(() => {
    loadWebsite();
  }, []);

  useEffect(() => {
    if (tab === "registry") loadRegistry();
    if (tab === "rsvp") loadRsvpTokens();
    if (tab === "gallery") loadPhotos();
  }, [tab]);

  async function loadWebsite() {
    try {
      const res = await fetch("/api/wedding-website");
      if (res.status === 404) { setNoWedding(true); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlug(data.slug || "");
      originalSlug.current = data.slug || "";
      setEnabled(data.enabled || false);
      wasEnabledOnLoad.current = data.enabled || false;
      setHeadline(data.headline || "");
      setStory(data.story || "");
      setCoverUrl(data.cover_url || "");
      setCouplePhotoUrl(data.couple_photo_url || "");
      setSchedule(data.schedule || []);
      setTravel(data.travel || "");
      setAccommodations(data.accommodations || "");
      setFaq(data.faq || []);
      setRsvpDeadline(data.rsvp_deadline || "");
      setMealOptions(data.meal_options || []);
      setPhotoApprovalRequired(data.photo_approval_required || false);
      setHeroLayout(data.website_theme?.heroLayout || "fullscreen");
    } catch {
      toast.error("Couldn't load website settings. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRegistry() {
    try {
      const res = await fetch("/api/wedding-website/registry");
      if (!res.ok) throw new Error();
      setRegistryLinks(await res.json());
    } catch {
      toast.error("Couldn't load registry links. Try refreshing.");
    }
  }

  async function loadRsvpTokens() {
    try {
      const res = await fetch("/api/wedding-website/rsvp");
      if (!res.ok) throw new Error();
      setRsvpTokens(await res.json());
    } catch {
      toast.error("Couldn't load RSVP data. Try refreshing.");
    }
  }

  async function loadPhotos() {
    try {
      const res = await fetch("/api/wedding-website/photos");
      if (!res.ok) throw new Error();
      setPhotos(await res.json());
    } catch {
      toast.error("Couldn't load photos. Try refreshing.");
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    if (!value || value === originalSlug.current) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(value) || value.length < 3) {
      setSlugStatus("taken");
      return;
    }
    setSlugStatus("checking");
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wedding-website/check-slug?slug=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.available) {
          setSlugStatus("available");
          autoSave({ slug: value });
          originalSlug.current = value;
        } else {
          setSlugStatus("taken");
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 300);
  }

  async function handleCoverUpload() {
    const file = coverRef.current?.files?.[0];
    if (!file) return;

    // Pre-validate before uploading
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(`Invalid file type: ${file.type}. Please upload an image (JPG, PNG, WebP).`);
      return;
    }

    setUploadingCover(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", "task");
    formData.append("entity_id", "website-cover");

    try {
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setCoverUrl(data.signed_url || data.file_url);
      autoSaveImmediate({ cover_url: data.file_url }); // save storage path, not signed URL
      toast.success("Cover image uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Cover upload failed: ${msg}`);
      console.error("[COVER UPLOAD]", msg);
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function handleCouplePhotoUpload() {
    const file = couplePhotoRef.current?.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(`Invalid file type: ${file.type}. Please upload an image (JPG, PNG, WebP).`);
      return;
    }

    setUploadingCouplePhoto(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", "task");
    formData.append("entity_id", "website-couple-photo");

    try {
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setCouplePhotoUrl(data.signed_url || data.file_url);
      autoSaveImmediate({ couple_photo_url: data.file_url }); // save storage path, not signed URL
      toast.success("Couple photo uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Photo upload failed: ${msg}`);
      console.error("[COUPLE PHOTO UPLOAD]", msg);
    } finally {
      setUploadingCouplePhoto(false);
      if (couplePhotoRef.current) couplePhotoRef.current.value = "";
    }
  }

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

  async function deletePhoto(id: string) {
    try {
      const res = await fetch(`/api/wedding-website/photos?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success("Photo removed");
    } catch {
      toast.error("Couldn't remove that photo. Try again.");
    }
  }

  async function importFromDayOfPlanner() {
    try {
      const res = await fetch("/api/day-of");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const timeline = data?.content?.timeline;
      if (!timeline || timeline.length === 0) {
        toast.error("Create a Day-of Plan first");
        return;
      }
      const mapped: ScheduleItem[] = timeline.map((item: { time: string; event: string }) => ({
        time: item.time,
        event: item.event,
      }));
      setImportItems(mapped);
      setImportConfirmOpen(true);
    } catch {
      toast.error("Create a Day-of Plan first");
    }
  }

  function confirmImport() {
    setSchedule(importItems);
    autoSave({ schedule: importItems }, 0);
    setImportConfirmOpen(false);
    setImportItems([]);
    toast.success("Schedule imported from Day-of Plan");
  }

  if (loading) {
    return <SkeletonList count={4} />;
  }

  if (noWedding) return <NoWeddingState feature="Wedding Website" />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "setup", label: "Setup" },
    { key: "schedule", label: "Schedule & Info" },
    { key: "registry", label: "Registry" },
    { key: "rsvp", label: "RSVP" },
    { key: "gallery", label: "Gallery" },
  ];

  return (
    <div className={showPreview ? "flex gap-6" : ""}>
    <div className={showPreview ? "flex-1 min-w-0" : ""}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1>Wedding Website</h1>
            <p className="mt-1 text-[15px] text-muted">
              Create and manage your wedding website for guests
            </p>
          </div>
          {saveStatus === "saving" && (
            <span className="text-[13px] text-muted animate-pulse">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[13px] text-green-600">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-[13px] text-red-500">Error saving</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {slug && enabled && (
            <button
              onClick={() => { setShowPreview(!showPreview); if (!showPreview) setTimeout(refreshPreview, 100); }}
              className={`btn-sm hidden lg:inline-flex items-center gap-1.5 ${showPreview ? "btn-primary" : "btn-secondary"}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
          )}
          {slug && enabled && (
            <a
              href={`/w/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary btn-sm inline-flex items-center gap-2"
            >
              View Website
              <span aria-hidden="true">&rarr;</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[15px] font-semibold rounded-t-[10px] transition ${
              tab === t.key
                ? "text-violet bg-lavender border-b-2 border-violet"
                : "text-muted hover:text-violet"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {/* Setup Tab */}
        {tab === "setup" && (
          <div className="max-w-lg space-y-6">
            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Website URL <Tooltip text="This is the public link to your wedding website. Share it with guests so they can view details, RSVP, and upload photos." wide />
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted">eydn.app/w/</span>
                <input
                  type="text"
                  value={slug}
                  aria-label="Wedding website URL slug"
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    handleSlugChange(val);
                  }}
                  placeholder="your-wedding"
                  className="flex-1 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
                />
                {slugStatus === "checking" && (
                  <span className="text-[12px] text-muted animate-pulse">Checking...</span>
                )}
                {slugStatus === "available" && (
                  <span className="text-[12px] text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Available
                  </span>
                )}
                {slugStatus === "taken" && (
                  <span className="text-[12px] text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Taken
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Enable wedding website"
                  aria-checked={enabled}
                  checked={enabled}
                  onChange={(e) => {
                    const newVal = e.target.checked;
                    setEnabled(newVal);
                    if (newVal) {
                      trackWebsitePublished();
                      if (!wasEnabledOnLoad.current) setShowLaunchMoment(true);
                    }
                    autoSaveImmediate({ enabled: newVal });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-violet transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <span className="text-[15px] text-plum font-semibold">
                Website {enabled ? "Enabled" : "Disabled"} <Tooltip text="When enabled, your wedding website is publicly visible at the URL above. Guests can view the schedule, RSVP, and browse the photo gallery." wide />
              </span>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Cover Image
              </label>
              {coverUrl && (
                <div className="mb-3 rounded-[16px] overflow-hidden h-40 relative">
                  <Image src={coverUrl} alt="Wedding cover photo" className="object-cover" fill unoptimized />
                </div>
              )}
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                onClick={() => coverRef.current?.click()}
                disabled={uploadingCover}
                className="btn-secondary btn-sm"
              >
                {uploadingCover ? "Uploading..." : coverUrl ? "Change Cover" : "Upload Cover"}
              </button>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Hero Layout
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setHeroLayout("fullscreen"); autoSaveImmediate({ website_theme: { heroLayout: "fullscreen" } }); }}
                  className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-[10px] transition ${heroLayout === "fullscreen" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
                >
                  Full Screen
                </button>
                <button
                  onClick={() => { setHeroLayout("side-by-side"); autoSaveImmediate({ website_theme: { heroLayout: "side-by-side" } }); }}
                  className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-[10px] transition ${heroLayout === "side-by-side" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
                >
                  Side by Side
                </button>
              </div>
              <p className="text-[11px] text-muted mt-1">Full screen uses the cover image as a full-bleed background. Side by side shows the image next to your names.</p>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Couple Photo
              </label>
              <p className="text-[12px] text-muted mb-2">
                A photo of you and your partner to feature on your website
              </p>
              {couplePhotoUrl && (
                <div className="mb-3 w-32 h-32 rounded-full overflow-hidden border-2 border-border relative">
                  <Image src={couplePhotoUrl} alt="Couple photo" className="object-cover" fill unoptimized />
                </div>
              )}
              <input
                ref={couplePhotoRef}
                type="file"
                accept="image/*"
                onChange={handleCouplePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => couplePhotoRef.current?.click()}
                disabled={uploadingCouplePhoto}
                className="btn-secondary btn-sm"
              >
                {uploadingCouplePhoto ? "Uploading..." : couplePhotoUrl ? "Change Photo" : "Upload Photo"}
              </button>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => {
                  setHeadline(e.target.value);
                  autoSave({ headline: e.target.value });
                }}
                placeholder="We're getting married!"
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Our Story
              </label>
              <textarea
                value={story}
                onChange={(e) => {
                  setStory(e.target.value);
                  autoSave({ story: e.target.value });
                }}
                placeholder="Share how you met, your proposal story, etc."
                rows={6}
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
              />
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {tab === "schedule" && (
          <div className="max-w-lg space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-plum">Schedule</h3>
                <button
                  onClick={importFromDayOfPlanner}
                  className="btn-secondary btn-sm text-violet"
                >
                  Import from Day-of Planner
                </button>
              </div>
              <div className="space-y-3">
                {schedule.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.time}
                      onChange={(e) => {
                        const updated = [...schedule];
                        updated[i] = { ...updated[i], time: e.target.value };
                        setSchedule(updated);
                        autoSave({ schedule: updated }, 2000);
                      }}
                      placeholder="4:30 PM"
                      className="w-32 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
                    />
                    <input
                      type="text"
                      value={item.event}
                      onChange={(e) => {
                        const updated = [...schedule];
                        updated[i] = { ...updated[i], event: e.target.value };
                        setSchedule(updated);
                        autoSave({ schedule: updated }, 2000);
                      }}
                      placeholder="Ceremony begins"
                      className="flex-1 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
                    />
                    <button
                      onClick={() => {
                        const updated = schedule.filter((_, j) => j !== i);
                        setSchedule(updated);
                        autoSave({ schedule: updated }, 2000);
                      }}
                      className="btn-ghost btn-sm text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const updated = [...schedule, { time: "", event: "" }];
                  setSchedule(updated);
                }}
                className="btn-ghost btn-sm mt-3 text-violet"
              >
                + Add Schedule Item
              </button>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Travel Info
              </label>
              <textarea
                value={travel}
                onChange={(e) => {
                  setTravel(e.target.value);
                  autoSave({ travel: e.target.value });
                }}
                placeholder="Airport info, driving directions, parking details..."
                rows={4}
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-muted block mb-1">
                Accommodations
              </label>
              <textarea
                value={accommodations}
                onChange={(e) => {
                  setAccommodations(e.target.value);
                  autoSave({ accommodations: e.target.value });
                }}
                placeholder="Hotel blocks, nearby lodging options..."
                rows={4}
                className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
              />
            </div>

            <div>
              <h3 className="text-[15px] font-semibold text-plum mb-4">FAQ</h3>
              <div className="space-y-4">
                {faq.map((item, i) => (
                  <div key={i} className="card p-4 space-y-2">
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const updated = [...faq];
                        updated[i] = { ...updated[i], question: e.target.value };
                        setFaq(updated);
                        autoSave({ faq: updated }, 2000);
                      }}
                      placeholder="Question"
                      className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-violet/30"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const updated = [...faq];
                        updated[i] = { ...updated[i], answer: e.target.value };
                        setFaq(updated);
                        autoSave({ faq: updated }, 2000);
                      }}
                      placeholder="Answer"
                      rows={2}
                      className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30 resize-none"
                    />
                    <button
                      onClick={() => {
                        const updated = faq.filter((_, j) => j !== i);
                        setFaq(updated);
                        autoSave({ faq: updated }, 2000);
                      }}
                      className="btn-ghost btn-sm text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {faq.length === 0 && (
                <div className="mt-3">
                  <p className="text-[12px] text-muted mb-2">Quick add a common question:</p>
                  <div className="flex flex-wrap gap-2">
                    {["Is there parking at the venue?", "What's the dress code?", "Are children welcome?"].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          const updated = [...faq, { question: q, answer: "" }];
                          setFaq(updated);
                          autoSave({ faq: updated }, 2000);
                        }}
                        className="rounded-full border border-violet/30 bg-lavender/50 px-3 py-1 text-[13px] text-violet hover:bg-lavender transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  const updated = [...faq, { question: "", answer: "" }];
                  setFaq(updated);
                }}
                className="btn-ghost btn-sm mt-3 text-violet"
              >
                + Add FAQ
              </button>
            </div>
          </div>
        )}

        {/* Registry Tab */}
        {tab === "registry" && (
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
        )}

        {/* RSVP Tab */}
        {tab === "rsvp" && (
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
        )}

        {/* Gallery Tab */}
        {tab === "gallery" && (
          <div className="space-y-6">
            {slug && (
              <div className="card-summary p-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-muted">Guest Upload Link</p>
                  <p className="text-[15px] text-plum">{`${typeof window !== "undefined" ? window.location.origin : ""}/w/${slug}`}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/w/${slug}`)}
                  className="btn-ghost btn-sm text-violet"
                >
                  Copy Link
                </button>
              </div>
            )}

            <div className="card p-4 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={photoApprovalRequired}
                  checked={photoApprovalRequired}
                  onChange={(e) => {
                    const newVal = e.target.checked;
                    setPhotoApprovalRequired(newVal);
                    autoSaveImmediate({ photo_approval_required: newVal });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-violet transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <div>
                <span className="text-[15px] text-plum font-semibold">
                  Approve guest photos before they appear publicly
                </span>
                <p className="text-[12px] text-muted mt-0.5">
                  When enabled, photos uploaded by guests won&apos;t be visible until you approve them.
                </p>
              </div>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="card overflow-hidden">
                    <div className="aspect-square relative">
                      <Image
                        src={photo.file_url}
                        alt={photo.caption || "Wedding photo"}
                        className="object-cover"
                        fill
                                             />
                    </div>
                    <div className="p-3 space-y-2">
                      {photo.caption && (
                        <p className="text-[13px] text-plum">{photo.caption}</p>
                      )}
                      <p className="text-[12px] text-muted">
                        By {photo.uploader_name || "Anonymous"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`badge text-[12px] ${
                            photo.approved
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {photo.approved ? "Approved" : "Pending"}
                        </span>
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          className="btn-ghost btn-sm text-red-500 text-[12px]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-muted">
                No photos uploaded yet. Share the wedding website link with your guests so they can upload photos.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Import from Day-of Planner confirmation dialog */}
      <ConfirmDialog
        open={importConfirmOpen}
        onConfirm={confirmImport}
        onCancel={() => { setImportConfirmOpen(false); setImportItems([]); }}
        title="Import Schedule"
        message={`Import ${importItems.length} items from your Day-of Plan? This will replace your current schedule.`}
        confirmLabel="Import"
        destructive={false}
      />
    </div>

    {/* Live preview panel */}
    {showPreview && slug && enabled && (
      <div className="hidden lg:flex flex-col w-[420px] flex-shrink-0 sticky top-0 h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Preview</span>
          <button
            onClick={refreshPreview}
            className="text-[11px] text-violet hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="flex-1 rounded-[12px] border border-border overflow-hidden bg-white shadow-sm">
          <iframe
            ref={previewRef}
            src={`/w/${slug}`}
            className="w-full h-full"
            title="Wedding website preview"
            style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%", height: "182%" }}
          />
        </div>
      </div>
    )}
      {/* Launch moment */}
      {showLaunchMoment && slug && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="bg-white rounded-[24px] max-w-lg w-full overflow-hidden shadow-2xl">
            {/* Mini preview */}
            <div className="h-48 bg-[#2C3E2D] relative overflow-hidden">
              <iframe
                src={`/w/${slug}`}
                className="w-full h-full pointer-events-none"
                title="Website preview"
                style={{ transform: "scale(0.35)", transformOrigin: "top left", width: "286%", height: "286%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-[32px]">&#127882;</span>
              </div>
            </div>
            <div className="px-8 pb-8 pt-4 text-center">
              <h2 className="text-[24px] font-semibold text-plum">Your website is live</h2>
              <p className="mt-2 text-[15px] text-muted leading-relaxed">
                Guests can now view your wedding details, RSVP, and share photos — all at one link.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 bg-lavender rounded-full px-5 py-3">
                <span className="text-[14px] font-semibold text-plum truncate">eydn.app/w/{slug}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://eydn.app/w/${slug}`);
                    toast.success("Link copied");
                  }}
                  className="flex-shrink-0 text-violet hover:text-plum transition"
                  aria-label="Copy link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <a
                  href={`https://eydn.app/w/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  View Live Site
                </a>
                <button
                  onClick={() => { setShowLaunchMoment(false); wasEnabledOnLoad.current = true; }}
                  className="btn-secondary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
