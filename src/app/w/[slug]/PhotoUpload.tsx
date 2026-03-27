"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  weddingSlug: string;
  hasPhotos?: boolean;
};

export function PhotoUpload({ weddingSlug, hasPhotos = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFileSelect(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      // Update the file input so handleSubmit can read it
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileRef.current) fileRef.current.files = dt.files;
      handleFileSelect(file);
    } else {
      toast.error("Please drop an image file");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Select a photo first");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("wedding_slug", weddingSlug);
    formData.append("uploader_name", uploaderName || "Anonymous");
    if (caption) formData.append("caption", caption);

    try {
      const res = await fetch("/api/public/photos", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      toast.success("Photo uploaded. It'll appear once reviewed.");
      setCaption("");
      setUploaderName("");
      setFileName("");
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast.error("Photo didn't upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!hasPhotos && (
        <div className="text-center py-4">
          <p className="text-[28px] mb-2">&#128248;</p>
          <p className="text-[16px] text-muted">
            Be the first to share a moment! Upload photos from the celebration.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4 text-left">
        <div>
          <label className="text-[13px] font-semibold text-muted block mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-muted block mb-1">
            Photo
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-[16px] border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              dragging
                ? "border-violet bg-violet/5 scale-[1.02]"
                : preview
                  ? "border-violet/40 bg-violet/5"
                  : "border-border hover:border-violet hover:bg-violet/5"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-40 mx-auto rounded-[10px] object-contain"
                />
                <p className="text-[14px] text-plum font-medium">{fileName}</p>
                <p className="text-[12px] text-muted">Click or drop to change</p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <p className="text-[24px]">&#128247;</p>
                <p className="text-[15px] font-medium text-plum">
                  Drop a photo here or click to browse
                </p>
                <p className="text-[13px] text-muted">
                  JPG, PNG, HEIC, or WebP
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-muted block mb-1">
            Caption
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-[10px] border border-border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>

        <button type="submit" disabled={uploading} className="btn-primary w-full">
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
      </form>
    </div>
  );
}
