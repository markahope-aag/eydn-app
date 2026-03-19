"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  entityType: "task" | "vendor";
  entityId: string;
  onUpload?: () => void;
};

export function FileUpload({ entityType, entityId, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);

    try {
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      toast.success("File uploaded");
      onUpload?.();
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-rose-600 hover:text-rose-500 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Attach file"}
      </button>
    </div>
  );
}
