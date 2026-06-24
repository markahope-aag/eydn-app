"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Tooltip } from "@/components/Tooltip";
import { usePremium } from "@/components/PremiumGate";
import { trackWebsitePublished } from "@/lib/analytics";

type SlugStatus = "idle" | "checking" | "available" | "taken";

// Curated palettes for one-tap theming; couples can also pick custom colors.
const COLOR_PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: "Forest & Blush", primary: "#2C3E2D", accent: "#D4A5A5" },
  { name: "Plum & Champagne", primary: "#4A2C4A", accent: "#E8D5B7" },
  { name: "Navy & Dusty Blue", primary: "#1F2D3D", accent: "#9DB4C0" },
  { name: "Terracotta & Sand", primary: "#9C5B3B", accent: "#E0C8A8" },
  { name: "Sage & Cream", primary: "#7A8B6F", accent: "#EDE7DF" },
];

interface SetupTabProps {
  slug: string;
  setSlug: (slug: string) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  wasEnabledOnLoad: React.RefObject<boolean>;
  setShowLaunchMoment: (show: boolean) => void;
  headline: string;
  setHeadline: (headline: string) => void;
  story: string;
  setStory: (story: string) => void;
  coverUrl: string;
  setCoverUrl: (url: string) => void;
  coverPosition: string;
  setCoverPosition: (position: string) => void;
  couplePhotoUrl: string;
  setCouplePhotoUrl: (url: string) => void;
  heroLayout: "fullscreen" | "side-by-side";
  setHeroLayout: (layout: "fullscreen" | "side-by-side") => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  autoSave: (fields: Record<string, unknown>, debounceMs?: number) => void;
  autoSaveImmediate: (fields: Record<string, unknown>) => void;
  originalSlug: React.RefObject<string>;
}

export function SetupTab({
  slug,
  setSlug,
  enabled,
  setEnabled,
  wasEnabledOnLoad,
  setShowLaunchMoment,
  headline,
  setHeadline,
  story,
  setStory,
  coverUrl,
  setCoverUrl,
  coverPosition,
  setCoverPosition,
  couplePhotoUrl,
  setCouplePhotoUrl,
  heroLayout,
  setHeroLayout,
  primaryColor,
  setPrimaryColor,
  accentColor,
  setAccentColor,
  autoSave,
  autoSaveImmediate,
  originalSlug,
}: SetupTabProps) {
  const { isReadOnly, notifyReadOnly } = usePremium();
  // Persist the whole theme object together — the API replaces website_theme
  // wholesale, so partial saves would wipe the other theme fields.
  function persistTheme(
    overrides: Partial<{ heroLayout: string; primaryColor: string; accentColor: string }>,
    immediate = false
  ) {
    const theme = { heroLayout, primaryColor, accentColor, ...overrides };
    if (immediate) autoSaveImmediate({ website_theme: theme });
    else autoSave({ website_theme: theme }, 500);
  }
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const coverRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverPreviewRef = useRef<HTMLDivElement>(null);
  const draggingCover = useRef(false);

  // Translate a pointer position over the cover preview into a CSS
  // object-position focal point, so couples can choose which part of a tall
  // photo stays visible instead of always centering.
  function setFocalFromEvent(e: React.PointerEvent<HTMLDivElement>) {
    const el = coverPreviewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    const pos = `${Math.round(x)}% ${Math.round(y)}%`;
    setCoverPosition(pos);
    autoSave({ cover_position: pos }, 400);
  }

  const [focalX, focalY] = coverPosition.split(" ").map((v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 50;
  });

  const couplePhotoRef = useRef<HTMLInputElement>(null);
  const [uploadingCouplePhoto, setUploadingCouplePhoto] = useState(false);

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
    if (isReadOnly) { notifyReadOnly(); return; }
    const file = coverRef.current?.files?.[0];
    if (!file) return;

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
      // Reset the focal point to center for the new image.
      setCoverPosition("50% 50%");
      autoSaveImmediate({ cover_url: data.file_url, cover_position: "50% 50%" });
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
    if (isReadOnly) { notifyReadOnly(); return; }
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
      autoSaveImmediate({ couple_photo_url: data.file_url });
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

  return (
    <div className="max-w-lg space-y-6">
      <p className="text-[13px] text-muted">
        Pick a URL, add your details and photos below, then publish when you&apos;re ready. Everything saves automatically as you go.
      </p>
      <div>
        <label htmlFor="website-slug" className="text-[13px] font-semibold text-muted block mb-1">
          Website URL <Tooltip text="This is the public link to your wedding website. Share it with guests so they can view details, RSVP, and upload photos." wide />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted">eydn.app/w/</span>
          <input
            id="website-slug"
            type="text"
            value={slug}
            onChange={(e) => {
              const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
              handleSlugChange(val);
            }}
            placeholder="your-wedding"
            className="flex-1 rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
          <span aria-live="polite" role="status">
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
          </span>
        </div>
      </div>

      {/* Publish */}
      {enabled ? (
        <div className="rounded-[14px] border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-[15px] font-semibold text-plum flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Your website is live
          </p>
          <p className="text-[13px] text-muted mt-1">
            Guests can visit it at{" "}
            <span className="font-semibold text-plum">eydn.app/w/{slug || "your-url"}</span>. Keep
            editing anytime — changes save and update automatically.
          </p>
          <button
            onClick={() => {
              setEnabled(false);
              autoSaveImmediate({ enabled: false });
            }}
            className="mt-3 text-[13px] font-semibold text-muted hover:text-error transition"
          >
            Unpublish — hide from guests
          </button>
        </div>
      ) : (
        <div className="rounded-[14px] border border-violet/25 bg-lavender/40 p-4">
          <p className="text-[15px] font-semibold text-plum">Ready to share your website?</p>
          <p className="text-[13px] text-muted mt-1">
            It&apos;s private while you build it. Add your details below, then publish to make it
            visible to guests at your URL.
          </p>
          <button
            onClick={() => {
              if (!slug) {
                toast.error("Choose a website URL above first");
                return;
              }
              setEnabled(true);
              trackWebsitePublished();
              if (!wasEnabledOnLoad.current) setShowLaunchMoment(true);
              autoSaveImmediate({ enabled: true });
            }}
            disabled={!slug}
            className="btn-primary btn-sm mt-3 disabled:opacity-50"
          >
            Publish Website
          </button>
          {!slug && (
            <p className="text-[11px] text-muted mt-1.5">
              Choose a website URL above to enable publishing.
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold text-muted block mb-1">
          Cover Image
        </p>
        {coverUrl && (
          <div className="mb-3">
            <div
              ref={coverPreviewRef}
              onPointerDown={(e) => {
                draggingCover.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                setFocalFromEvent(e);
              }}
              onPointerMove={(e) => {
                if (draggingCover.current) setFocalFromEvent(e);
              }}
              onPointerUp={() => {
                draggingCover.current = false;
              }}
              className="rounded-[16px] overflow-hidden h-40 relative cursor-crosshair select-none touch-none"
            >
              <Image
                src={coverUrl}
                alt="Wedding cover photo"
                className="object-cover"
                style={{ objectPosition: coverPosition }}
                fill
                unoptimized
              />
              <span
                aria-hidden="true"
                className="absolute -ml-3 -mt-3 h-6 w-6 rounded-full border-2 border-white bg-violet/30 ring-2 ring-violet shadow pointer-events-none"
                style={{ left: `${focalX}%`, top: `${focalY}%` }}
              />
            </div>
            <p className="text-[11px] text-muted mt-1">
              Tall or vertical photo getting cropped? Drag the dot (or tap a spot)
              to choose which part of the image stays in view.
            </p>
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
          disabled={uploadingCover || isReadOnly}
          className="btn-secondary btn-sm disabled:opacity-50"
        >
          {uploadingCover ? "Uploading..." : coverUrl ? "Change Cover" : "Upload Cover"}
        </button>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-muted block mb-1">
          Website Header Image
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setHeroLayout("fullscreen"); persistTheme({ heroLayout: "fullscreen" }, true); }}
            className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-[10px] transition ${heroLayout === "fullscreen" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
          >
            Full Screen
          </button>
          <button
            onClick={() => { setHeroLayout("side-by-side"); persistTheme({ heroLayout: "side-by-side" }, true); }}
            className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-[10px] transition ${heroLayout === "side-by-side" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
          >
            Side by Side
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1">Full screen uses the cover image as a full-bleed background. Side by side shows the image next to your names.</p>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-muted block mb-1">Colors</p>
        <p className="text-[12px] text-muted mb-2">
          Sets the gradient and accent colors across your public site.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[13px] text-plum">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => { setPrimaryColor(e.target.value); persistTheme({ primaryColor: e.target.value }); }}
              aria-label="Primary color"
              className="h-9 w-12 rounded-[8px] border border-border bg-white p-0.5 cursor-pointer"
            />
            Primary
          </label>
          <label className="flex items-center gap-2 text-[13px] text-plum">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => { setAccentColor(e.target.value); persistTheme({ accentColor: e.target.value }); }}
              aria-label="Accent color"
              className="h-9 w-12 rounded-[8px] border border-border bg-white p-0.5 cursor-pointer"
            />
            Accent
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => {
            const active = primaryColor.toLowerCase() === p.primary.toLowerCase() && accentColor.toLowerCase() === p.accent.toLowerCase();
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => { setPrimaryColor(p.primary); setAccentColor(p.accent); persistTheme({ primaryColor: p.primary, accentColor: p.accent }, true); }}
                title={p.name}
                aria-label={p.name}
                className={`flex items-center gap-1 rounded-full border px-1.5 py-1 transition ${active ? "border-violet ring-1 ring-violet" : "border-border hover:border-violet/50"}`}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: p.primary }} />
                <span className="h-4 w-4 rounded-full" style={{ background: p.accent }} />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-muted block mb-1">
          Couple Photo
        </p>
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
          disabled={uploadingCouplePhoto || isReadOnly}
          className="btn-secondary btn-sm disabled:opacity-50"
        >
          {uploadingCouplePhoto ? "Uploading..." : couplePhotoUrl ? "Change Photo" : "Upload Photo"}
        </button>
      </div>

      <div>
        <label htmlFor="website-headline" className="text-[13px] font-semibold text-muted block mb-1">
          Headline
        </label>
        <input
          id="website-headline"
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
        <label htmlFor="website-story" className="text-[13px] font-semibold text-muted block mb-1">
          Our Story
        </label>
        <textarea
          id="website-story"
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
  );
}
