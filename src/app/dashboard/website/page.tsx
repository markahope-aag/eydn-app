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
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [mealOptions, setMealOptions] = useState<string[]>([]);
  const [newMealOption, setNewMealOption] = useState("");

  // Gallery state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoApprovalRequired, setPhotoApprovalRequired] = useState(false);

  // Couple photo
  const [couplePhotoUrl, setCouplePhotoUrl] = useState("");

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
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoverUrl(data.file_url);
      autoSaveImmediate({ cover_url: data.file_url });
      toast.success("Cover image uploaded");
    } catch {
      toast.error("Cover image didn't upload. Try again.");
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function handleCouplePhotoUpload() {
    const file = couplePhotoRef.current?.files?.[0];
    if (!file) return;
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
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCouplePhotoUrl(data.file_url);
      autoSaveImmediate({ couple_photo_url: data.file_url });
      toast.success("Couple photo uploaded");
    } catch {
      toast.error("Photo didn't upload. Try again.");
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
    <div>
      <div className="flex items-center justify-between">
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

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[15px] font-semibold rounded-t-[10px] transition ${
              tab === t.key
                ? "text-violet bg-lavender border-b-2 border-violet"
                : "text-plum/60 hover:text-violet"
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
                  aria-checked={enabled}
                  checked={enabled}
                  onChange={(e) => {
                    const newVal = e.target.checked;
                    setEnabled(newVal);
                    if (newVal) trackWebsitePublished();
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
                {["Amazon Wedding Registry", "Zola", "Target", "Crate & Barrel", "Honeyfund"].map((name) => (
                  <button
                    key={name}
                    onClick={() => setNewRegistryName(name)}
                    className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-medium transition ${
                      newRegistryName === name
                        ? "border-violet bg-lavender text-violet"
                        : "border-border bg-white text-plum hover:border-violet/40 hover:bg-lavender/30"
                    }`}
                  >
                    {name}
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
  );
}
