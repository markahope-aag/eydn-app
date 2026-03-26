"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  weddingSlug: string;
};

export function PhotoUpload({ weddingSlug }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

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
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast.error("Photo didn't upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
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
          className="rounded-[10px] border border-dashed border-border p-6 text-center cursor-pointer hover:border-violet transition"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            className="hidden"
          />
          {fileName ? (
            <p className="text-[15px] text-plum">{fileName}</p>
          ) : (
            <p className="text-[15px] text-muted">Click to select a photo</p>
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
  );
}
