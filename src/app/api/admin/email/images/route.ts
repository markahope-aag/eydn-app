import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin";
import { untypedClient } from "@/lib/supabase/server";
import type { EmailImage } from "@/lib/images/email-image";

const BUCKET = "email-images";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extensionFor(mime: string, fallback: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  return fallback || "bin";
}

type Row = {
  id: string;
  path: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  content_type: string | null;
  created_at: string;
};

/**
 * GET /api/admin/email/images — list the email image library, newest first,
 * each with its public URL resolved.
 */
export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const db = untypedClient(result.supabase);

  const { data, error } = await db
    .from("email_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(error.message, 500);
  }

  const images: EmailImage[] = (data as Row[]).map((row) => ({
    ...row,
    url: db.storage.from(BUCKET).getPublicUrl(row.path).data.publicUrl,
  }));

  return NextResponse.json({ images });
}

/**
 * POST /api/admin/email/images — upload an image (multipart form). The client
 * resizes/compresses before uploading and supplies the final width/height; the
 * server validates, stores the binary, and records the metadata.
 */
export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const db = untypedClient(result.supabase);

  const formData = await request.formData();
  const file = formData.get("file");
  const alt = ((formData.get("alt") as string | null) || "").slice(0, 300);
  const width = Number.parseInt((formData.get("width") as string) || "", 10);
  const height = Number.parseInt((formData.get("height") as string) || "", 10);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds ${MAX_BYTES / (1024 * 1024)}MB limit` },
      { status: 413 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}. Use JPEG, PNG, WebP, GIF, or AVIF.` },
      { status: 415 }
    );
  }

  const originalName = file.name || "image";
  const dot = originalName.lastIndexOf(".");
  const fallbackExt = dot > -1 ? originalName.slice(dot + 1).toLowerCase() : "";
  const ext = extensionFor(file.type, fallbackExt);
  const baseSlug =
    slugify(originalName.slice(0, dot > -1 ? dot : originalName.length)) || "email";
  const path = `${baseSlug}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: row, error: insertError } = await db
    .from("email_images")
    .insert({
      path,
      alt_text: alt,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      byte_size: file.size,
      content_type: file.type,
      created_by: result.userId,
    })
    .select("*")
    .single();

  if (insertError) {
    // Roll back the orphaned upload so storage and metadata stay consistent.
    await db.storage.from(BUCKET).remove([path]);
    return apiError(insertError.message, 500);
  }

  const image: EmailImage = {
    ...(row as Row),
    url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
  };

  return NextResponse.json({ image });
}
