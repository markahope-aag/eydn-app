"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type EmailImage,
  emailImageSnippet,
  formatBytes,
} from "@/lib/images/email-image";

/**
 * Modal that lists the email image library and inserts a chosen image's <img>
 * snippet via `onInsert`. Used by the email template editor.
 */
export function EmailImagePicker({
  onInsert,
  onClose,
}: {
  onInsert: (snippet: string) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<EmailImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/email/images")
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d) => setImages(d.images || []))
      .catch(() => toast.error("Failed to load images"))
      .finally(() => setLoading(false));
  }, []);

  function pick(img: EmailImage) {
    onInsert(
      emailImageSnippet({ url: img.url, alt_text: img.alt_text, width: img.width })
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-plum/50 flex items-start justify-center overflow-y-auto p-6">
      <div className="bg-surface rounded-2xl max-w-3xl w-full my-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-[18px]">Insert image</h2>
            <p className="text-[12px] text-muted mt-0.5">
              Pick an image to drop into the email body.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm">Close</button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-[15px] text-muted py-6">Loading...</p>
          ) : images.length === 0 ? (
            <p className="text-[15px] text-muted py-6">
              No images yet. Add some in Admin → Email Images first.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => pick(img)}
                  className="card overflow-hidden text-left hover:ring-2 hover:ring-violet transition"
                >
                  <div className="bg-whisper flex items-center justify-center p-2 h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt_text || "Email image"}
                      className="max-h-28 w-auto object-contain"
                    />
                  </div>
                  <div className="px-3 py-2 text-[12px] text-muted">
                    {img.width && img.height ? `${img.width}×${img.height}` : "—"} ·{" "}
                    {formatBytes(img.byte_size)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
