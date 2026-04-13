import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const formData = await request.formData();
  const file = formData.get("file");
  const slugHint = (formData.get("slug") as string | null) || "blog";

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
  const baseSlug = slugify(slugHint || originalName.slice(0, dot > -1 ? dot : originalName.length));
  const timestamp = Date.now();
  const path = `${baseSlug}-${timestamp}.${ext}`;

  const supabase = createSupabaseAdmin();
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("blog-images")
    .upload(path, arrayBuffer, {
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

  const { data: publicData } = supabase.storage.from("blog-images").getPublicUrl(path);

  return NextResponse.json({
    url: publicData.publicUrl,
    path,
    size: file.size,
    type: file.type,
  });
}
