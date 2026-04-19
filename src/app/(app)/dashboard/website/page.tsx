"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { SetupTab } from "./_components/SetupTab";
import { ScheduleTab } from "./_components/ScheduleTab";
import { RegistryTab } from "./_components/RegistryTab";
import { RsvpTab } from "./_components/RsvpTab";
import { GalleryTab } from "./_components/GalleryTab";

type Tab = "setup" | "schedule" | "registry" | "rsvp" | "gallery";
type ScheduleItem = { time: string; event: string };
type FaqItem = { question: string; answer: string };
type RegistryLink = { id: string; name: string; url: string; sort_order: number };
type RsvpToken = {
  id: string; token: string; responded: boolean; responded_at: string | null;
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
  const [couplePhotoUrl, setCouplePhotoUrl] = useState("");
  const [heroLayout, setHeroLayout] = useState<"fullscreen" | "side-by-side">("fullscreen");
  const originalSlug = useRef("");

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [travel, setTravel] = useState("");
  const [accommodations, setAccommodations] = useState("");
  const [faq, setFaq] = useState<FaqItem[]>([]);

  // Registry / RSVP / Gallery state
  const [registryLinks, setRegistryLinks] = useState<RegistryLink[]>([]);
  const [rsvpTokens, setRsvpTokens] = useState<RsvpToken[]>([]);
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [mealOptions, setMealOptions] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoApprovalRequired, setPhotoApprovalRequired] = useState(false);

  // Preview panel
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  function refreshPreview() {
    if (previewRef.current) {
      previewRef.current.src = previewRef.current.src;
    }
  }

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout>>(null);

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
          if (previewRef.current) previewRef.current.src = previewRef.current.src;
        } catch (err) {
          setSaveStatus("error");
          toast.error(err instanceof Error ? err.message : "Failed to save");
        }
      }, debounceMs);
    },
    []
  );

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
    try { const r = await fetch("/api/wedding-website/registry"); if (!r.ok) throw new Error(); setRegistryLinks(await r.json()); }
    catch { toast.error("Couldn't load registry links. Try refreshing."); }
  }

  async function loadRsvpTokens() {
    try { const r = await fetch("/api/wedding-website/rsvp"); if (!r.ok) throw new Error(); setRsvpTokens(await r.json()); }
    catch { toast.error("Couldn't load RSVP data. Try refreshing."); }
  }

  async function loadPhotos() {
    try { const r = await fetch("/api/wedding-website/photos"); if (!r.ok) throw new Error(); setPhotos(await r.json()); }
    catch { toast.error("Couldn't load photos. Try refreshing."); }
  }

  if (loading) return <SkeletonList count={4} />;
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
        {tab === "setup" && (
          <SetupTab
            slug={slug}
            setSlug={setSlug}
            enabled={enabled}
            setEnabled={setEnabled}
            wasEnabledOnLoad={wasEnabledOnLoad}
            setShowLaunchMoment={setShowLaunchMoment}
            headline={headline}
            setHeadline={setHeadline}
            story={story}
            setStory={setStory}
            coverUrl={coverUrl}
            setCoverUrl={setCoverUrl}
            couplePhotoUrl={couplePhotoUrl}
            setCouplePhotoUrl={setCouplePhotoUrl}
            heroLayout={heroLayout}
            setHeroLayout={setHeroLayout}
            autoSave={autoSave}
            autoSaveImmediate={autoSaveImmediate}
            originalSlug={originalSlug}
          />
        )}

        {tab === "schedule" && (
          <ScheduleTab
            schedule={schedule}
            setSchedule={setSchedule}
            travel={travel}
            setTravel={setTravel}
            accommodations={accommodations}
            setAccommodations={setAccommodations}
            faq={faq}
            setFaq={setFaq}
            autoSave={autoSave}
          />
        )}

        {tab === "registry" && (
          <RegistryTab
            registryLinks={registryLinks}
            loadRegistry={loadRegistry}
          />
        )}

        {tab === "rsvp" && (
          <RsvpTab
            slug={slug}
            rsvpTokens={rsvpTokens}
            loadRsvpTokens={loadRsvpTokens}
            rsvpDeadline={rsvpDeadline}
            setRsvpDeadline={setRsvpDeadline}
            mealOptions={mealOptions}
            setMealOptions={setMealOptions}
            autoSave={autoSave}
          />
        )}

        {tab === "gallery" && (
          <GalleryTab
            slug={slug}
            photos={photos}
            setPhotos={setPhotos}
            photoApprovalRequired={photoApprovalRequired}
            setPhotoApprovalRequired={setPhotoApprovalRequired}
            autoSaveImmediate={autoSaveImmediate}
          />
        )}
      </div>
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
