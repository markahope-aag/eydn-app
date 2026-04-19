"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Tooltip } from "@/components/Tooltip";
import { trackWebsitePublished } from "@/lib/analytics";

type SlugStatus = "idle" | "checking" | "available" | "taken";

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
  couplePhotoUrl: string;
  setCouplePhotoUrl: (url: string) => void;
  heroLayout: "fullscreen" | "side-by-side";
  setHeroLayout: (layout: "fullscreen" | "side-by-side") => void;
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
  couplePhotoUrl,
  setCouplePhotoUrl,
  heroLayout,
  setHeroLayout,
  autoSave,
  autoSaveImmediate,
  originalSlug,
}: SetupTabProps) {
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const coverRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

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
      autoSaveImmediate({ cover_url: data.file_url });
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
  );
}
