"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { resizeImage } from "@/lib/images/resize";
import {
  type EmailImage,
  emailImageSnippet,
  formatBytes,
} from "@/lib/images/email-image";

const SIZE_PRESETS = [
  { label: "Email width — 600px", value: 600 },
  { label: "Half width — 300px", value: 300 },
  { label: "Thumbnail — 150px", value: 150 },
  { label: "Original size", value: 0 },
] as const;

export default function EmailImagesPage() {
  const [images, setImages] = useState<EmailImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/email/images")
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d) => {
        if (active) setImages(d.images || []);
      })
      .catch(() => toast.error("Failed to load images"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <h1>Email Images</h1>
        <p className="mt-2 text-[15px] text-muted max-w-2xl">
          Upload and store images for use in email templates. Images are resized
          for email before upload to keep messages light, then dropped into a
          template with one click from the editor — or copy the snippet here.
        </p>
      </div>

      <UploadPanel onUploaded={(img) => setImages((prev) => [img, ...prev])} />

      <section>
        <h2 className="mb-4">Library</h2>
        {loading && images.length === 0 ? (
          <p className="text-[15px] text-muted py-8">Loading...</p>
        ) : images.length === 0 ? (
          <p className="text-[15px] text-muted py-8">
            No images yet. Upload one above to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {images.map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                onDeleted={() =>
                  setImages((prev) => prev.filter((i) => i.id !== img.id))
                }
                onAltSaved={(alt) =>
                  setImages((prev) =>
                    prev.map((i) => (i.id === img.id ? { ...i, alt_text: alt } : i))
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UploadPanel({ onUploaded }: { onUploaded: (img: EmailImage) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [maxWidth, setMaxWidth] = useState<number>(600);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const { blob, width, height, contentType } = await resizeImage(file, maxWidth);
      const form = new FormData();
      const name = file.name.replace(/\.[^.]+$/, "");
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
      form.append("file", new File([blob], `${name}.${ext}`, { type: contentType }));
      form.append("alt", alt);
      form.append("width", String(width));
      form.append("height", String(height));

      const r = await fetch("/api/admin/email/images", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Upload failed");

      toast.success("Image uploaded");
      onUploaded(data.image);
      setFile(null);
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="mb-4 text-[18px]">Upload an image</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="img-file">Image file</label>
          <input
            id="img-file"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full mt-1.5"
          />
          <p className="mt-1.5 text-[12px] text-muted">
            JPEG, PNG, WebP, GIF, or AVIF. Up to 8MB.
          </p>
        </div>
        <div>
          <label htmlFor="img-size">Resize to</label>
          <select
            id="img-size"
            value={maxWidth}
            onChange={(e) => setMaxWidth(Number(e.target.value))}
            className="w-full mt-1.5"
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-muted">
            Animated GIFs are kept at their original size to preserve animation.
          </p>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="img-alt">Alt text (describes the image for accessibility)</label>
          <input
            id="img-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="e.g. Couple walking through a vineyard at sunset"
            className="w-full mt-1.5"
          />
        </div>
      </div>
      <div className="mt-4">
        <button onClick={upload} disabled={!file || busy} className="btn-primary btn-sm">
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>
    </section>
  );
}

function ImageCard({
  image,
  onDeleted,
  onAltSaved,
}: {
  image: EmailImage;
  onDeleted: () => void;
  onAltSaved: (alt: string) => void;
}) {
  const [alt, setAlt] = useState(image.alt_text);
  const [saving, setSaving] = useState(false);
  const altDirty = alt !== image.alt_text;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function saveAlt() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/email/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt_text: alt }),
      });
      if (!r.ok) throw new Error();
      toast.success("Alt text saved");
      onAltSaved(alt);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this image? Emails already using it will break.")) return;
    try {
      const r = await fetch(`/api/admin/email/images/${image.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Image deleted");
      onDeleted();
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="bg-whisper flex items-center justify-center p-3 border-b border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.alt_text || "Email image"}
          className="max-h-40 w-auto object-contain rounded-md"
        />
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex gap-3 text-[12px] text-muted">
          <span>
            {image.width && image.height ? `${image.width}×${image.height}` : "—"}
          </span>
          <span>·</span>
          <span>{formatBytes(image.byte_size)}</span>
        </div>

        <div>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Alt text"
            className="w-full text-[13px]"
          />
          {altDirty && (
            <button
              onClick={saveAlt}
              disabled={saving}
              className="btn-secondary btn-sm mt-2"
            >
              {saving ? "Saving..." : "Save alt text"}
            </button>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <button onClick={() => copy(image.url, "URL")} className="btn-secondary btn-sm">
            Copy URL
          </button>
          <button
            onClick={() =>
              copy(
                emailImageSnippet({ url: image.url, alt_text: alt, width: image.width }),
                "Image tag"
              )
            }
            className="btn-secondary btn-sm"
          >
            Copy &lt;img&gt;
          </button>
          <button onClick={remove} className="btn-ghost btn-sm text-declined-text">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
