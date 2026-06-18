"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { PhotoUpload } from "@/app/(marketing)/w/[slug]/PhotoUpload";
import { usePremium } from "@/components/PremiumGate";

type Photo = { id: string; file_url: string; caption: string | null; uploader_name: string | null; approved: boolean; created_at: string };

interface GalleryTabProps {
  slug: string;
  photos: Photo[];
  setPhotos: (photos: Photo[]) => void;
  photoApprovalRequired: boolean;
  setPhotoApprovalRequired: (required: boolean) => void;
  autoSaveImmediate: (fields: Record<string, unknown>) => void;
}

export function GalleryTab({
  slug,
  photos,
  setPhotos,
  photoApprovalRequired,
  setPhotoApprovalRequired,
  autoSaveImmediate,
}: GalleryTabProps) {
  const { isReadOnly, notifyReadOnly } = usePremium();
  const [downloading, setDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Link copied");
  }

  // Pull the latest photos after a preview upload so the couple sees their
  // test shot land in the gallery without a manual refresh.
  async function refreshPhotos() {
    try {
      const res = await fetch("/api/wedding-website/photos");
      if (res.ok) setPhotos(await res.json());
    } catch {
      /* Non-fatal — the photo still uploaded; the list just won't auto-refresh. */
    }
  }

  // Zip every gallery photo client-side and download it in one go. JSZip is
  // imported lazily so it doesn't weigh down the page until used.
  async function downloadAll() {
    if (photos.length === 0) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let added = 0;
      await Promise.all(
        photos.map(async (photo, i) => {
          try {
            const res = await fetch(photo.file_url);
            if (!res.ok) return;
            const blob = await res.blob();
            const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
            const base =
              (photo.caption || photo.uploader_name || `photo-${i + 1}`)
                .replace(/[^a-z0-9-_ ]/gi, "")
                .trim()
                .slice(0, 40) || `photo-${i + 1}`;
            zip.file(`${String(i + 1).padStart(3, "0")}-${base}.${ext}`, blob);
            added++;
          } catch {
            // Skip any photo that fails to fetch; others still download.
          }
        })
      );
      if (added === 0) {
        toast.error("Couldn't download the photos. Try again.");
        return;
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wedding-photos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        added < photos.length ? `Downloaded ${added} of ${photos.length} photos` : "Photos downloaded"
      );
    } catch {
      toast.error("Couldn't build the download. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function deletePhoto(id: string) {
    if (isReadOnly) { notifyReadOnly(); return; }
    try {
      const res = await fetch(`/api/wedding-website/photos?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPhotos(photos.filter((p) => p.id !== id));
      toast.success("Photo removed");
    } catch {
      toast.error("Couldn't remove that photo. Try again.");
    }
  }

  async function setApproved(id: string, approved: boolean) {
    if (isReadOnly) { notifyReadOnly(); return; }
    try {
      const res = await fetch("/api/wedding-website/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved }),
      });
      if (!res.ok) throw new Error();
      setPhotos(photos.map((p) => (p.id === id ? { ...p, approved } : p)));
      toast.success(approved ? "Photo approved — now visible on your site" : "Photo set back to pending");
    } catch {
      toast.error("Couldn't update that photo. Try again.");
    }
  }

  return (
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

      {/* Owner preview — guests only see the upload form on the public site
          from the wedding day onward, so give the couple the same form here to
          test the flow anytime. Uploads go through the real public endpoint and
          appear in the gallery below. */}
      {slug && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-plum">Preview guest photo upload</p>
              <p className="text-[12px] text-muted mt-0.5">
                This is the exact form guests use. It appears on your public site from the
                wedding day on — preview and test it here anytime.
              </p>
            </div>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="btn-ghost btn-sm text-violet flex-shrink-0"
            >
              {showPreview ? "Hide" : "Preview"}
            </button>
          </div>
          {showPreview && (
            <div className="mt-4 max-w-md">
              <PhotoUpload weddingSlug={slug} hasPhotos={photos.length > 0} onUploaded={refreshPhotos} />
            </div>
          )}
        </div>
      )}

      <div className="card p-4 flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            role="switch"
            aria-checked={photoApprovalRequired}
            aria-label="Approve guest photos before they appear publicly"
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
        <>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </p>
          <button
            onClick={downloadAll}
            disabled={downloading}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {downloading ? "Preparing…" : "Download all"}
          </button>
        </div>
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
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`badge text-[12px] ${
                      photo.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {photo.approved ? "Approved" : "Pending"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setApproved(photo.id, !photo.approved)}
                      disabled={isReadOnly}
                      className="btn-ghost btn-sm text-[12px] text-violet disabled:opacity-50"
                    >
                      {photo.approved ? "Unapprove" : "Approve"}
                    </button>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      disabled={isReadOnly}
                      className="btn-ghost btn-sm text-red-500 text-[12px] disabled:opacity-50"
                    >
                      {photo.approved ? "Remove" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <p className="text-[15px] text-muted">
          No photos uploaded yet. Share the wedding website link with your guests so they can upload photos.
        </p>
      )}
    </div>
  );
}
