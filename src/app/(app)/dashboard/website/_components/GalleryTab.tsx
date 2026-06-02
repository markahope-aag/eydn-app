"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

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
  const [downloading, setDownloading] = useState(false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Link copied");
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
    try {
      const res = await fetch(`/api/wedding-website/photos?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPhotos(photos.filter((p) => p.id !== id));
      toast.success("Photo removed");
    } catch {
      toast.error("Couldn't remove that photo. Try again.");
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
        </>
      ) : (
        <p className="text-[15px] text-muted">
          No photos uploaded yet. Share the wedding website link with your guests so they can upload photos.
        </p>
      )}
    </div>
  );
}
