import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { UPLOAD } from "@/lib/config";

/** Map a validated image MIME type to a safe file extension. The MIME type
 *  comes from the same allowlist used to gate the upload, so this is the
 *  authoritative source for the extension — never the user-supplied filename. */
function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/heic": return "heic";
    case "image/heif": return "heif";
    default: return "bin";
  }
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`photos:${ip}`, RATE_LIMITS.public);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }
  const supabase = createSupabaseAdmin();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const weddingSlug = formData.get("wedding_slug") as string | null;
  const uploaderName = formData.get("uploader_name") as string | null;
  const caption = formData.get("caption") as string | null;

  if (!file || !weddingSlug) {
    return NextResponse.json({ error: "Missing file or wedding_slug" }, { status: 400 });
  }

  // Validate slug format — alphanumeric and hyphens only, 3-100 chars
  if (!/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/.test(weddingSlug)) {
    return NextResponse.json({ error: "Invalid wedding slug" }, { status: 400 });
  }

  // Validate file size (max 10MB)
  if (file.size > UPLOAD.MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  // Validate file type (images only)
  if (!(UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and HEIC images are allowed." }, { status: 400 });
  }

  // Look up wedding by slug. Pull photo_approval_required so we can honour the
  // couple's moderation setting on insert.
  const { data: weddingRaw, error: weddingError } = await supabase
    .from("weddings")
    .select("id, photo_approval_required")
    .eq("website_slug", weddingSlug)
    .eq("website_enabled", true)
    .maybeSingle();

  const wedding = weddingRaw as { id: string; photo_approval_required: boolean | null } | null;

  if (weddingError || !wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  // Derive the file extension from the VALIDATED MIME type, not the
  // user-supplied filename. Trusting `file.name.split(".").pop()` lets a
  // file named "evil.jpg.php" produce a `.php` extension in the storage
  // path — a latent risk if the bucket ever serves files with execution
  // permissions or if a CDN misroutes based on extension.
  const ext = extensionForMime(file.type);
  const fileName = `${wedding.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("wedding-photos")
    .upload(fileName, buffer, {
      contentType: file.type,
    });

  if (uploadError) {
    console.error("[PHOTO-UPLOAD]", uploadError.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("wedding-photos")
    .getPublicUrl(fileName);

  // Honour the couple's moderation setting: when approval is required the photo
  // stays hidden until they approve it; otherwise it appears publicly right away.
  const approved = !wedding.photo_approval_required;

  // Create photo record
  const { error: photoError } = await supabase
    .from("wedding_photos")
    .insert({
      wedding_id: wedding.id,
      uploaded_by: "guest",
      uploader_name: uploaderName || "Anonymous",
      file_url: urlData.publicUrl,
      caption: caption || null,
      approved,
    });

  if (photoError) {
    console.error("[PHOTO-UPLOAD]", photoError.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, approved }, { status: 201 });
}
