"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Dashboard couple-photo placeholder. Clicking it opens a file picker and
 * uploads the photo inline — it no longer just links to the website tab.
 * The photo is stored as the wedding's couple photo (shared with the
 * wedding website), then the dashboard refreshes to show it.
 */
export function AddCouplePhoto() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", "task");
      formData.append("entity_id", "website-couple-photo");

      const uploadRes = await fetch("/api/attachments", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || `Upload failed (${uploadRes.status})`);
      }

      const saveRes = await fetch("/api/wedding-website", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couple_photo_url: uploadData.file_url }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json().catch(() => ({}));
        throw new Error(saveData.error || `Couldn't save the photo (${saveRes.status})`);
      }

      toast.success("Couple photo added.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
      console.error("[ADD COUPLE PHOTO]", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="hidden sm:flex flex-shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-border items-center justify-center hover:border-violet hover:bg-lavender/30 transition group disabled:opacity-60 disabled:cursor-default"
        title="Add a couple photo"
      >
        <div className="text-center">
          {uploading ? (
            <span
              aria-hidden="true"
              className="mx-auto block w-5 h-5 border-2 border-lavender border-t-violet rounded-full animate-spin"
            />
          ) : (
            <svg
              className="mx-auto text-muted group-hover:text-violet transition"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          <span className="text-[9px] text-muted group-hover:text-violet transition mt-0.5 block">
            {uploading ? "Uploading..." : "Add photo"}
          </span>
        </div>
      </button>
    </>
  );
}
