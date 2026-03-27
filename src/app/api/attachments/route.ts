import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { requirePremium } from "@/lib/subscription";

// Synthetic entity IDs used by website and vision board uploads — not real DB records
const SYNTHETIC_IDS = new Set(["website-cover", "website-couple-photo", "mood-board", "wedding-party-photo"]);

function isSyntheticUpload(entityId: string) {
  return SYNTHETIC_IDS.has(entityId);
}

async function verifyEntityOwnership(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdmin>,
  entityType: string,
  entityId: string,
  weddingId: string
): Promise<NextResponse | null> {
  if (isSyntheticUpload(entityId)) return null;

  if (entityType === "task") {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", entityId)
      .eq("wedding_id", weddingId)
      .single();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  } else if (entityType === "vendor") {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", entityId)
      .eq("wedding_id", weddingId)
      .single();
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
  }

  return null;
}

export async function GET(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entity_type");
  const entityId = url.searchParams.get("entity_id");

  if (entityType && entityId) {
    const err = await verifyEntityOwnership(supabase, entityType, entityId, wedding.id);
    if (err) return err;
  }

  let query = supabase
    .from("attachments")
    .select()
    .eq("wedding_id", wedding.id);

  if (entityType) query = query.eq("entity_type", entityType as "task" | "vendor");
  if (entityId) query = query.eq("entity_id", entityId);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Generate signed URLs (1 hour expiry) for each attachment
  const withUrls = await Promise.all(
    ((data || []) as Array<{ file_url: string; [key: string]: unknown }>).map(async (a) => {
      // If file_url is already a full URL (legacy public bucket), pass through
      if (a.file_url.startsWith("http")) return a;
      const { data: signed } = await supabase.storage
        .from("attachments")
        .createSignedUrl(a.file_url, 3600);
      return { ...a, file_url: signed?.signedUrl || a.file_url };
    })
  );

  return NextResponse.json(withUrls);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const entityType = formData.get("entity_type") as string;
  const entityId = formData.get("entity_id") as string;

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  // Validate file type
  const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff", "image/heic", "image/heif", "image/svg+xml", "image/avif",
    "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "text/plain",
  ];
  if (!ALLOWED_TYPES.includes(file.type) && file.type !== "application/octet-stream") {
    return NextResponse.json({ error: "File type not allowed. Accepted: images, PDF, Word, Excel, CSV." }, { status: 400 });
  }

  // Verify file content is not a script disguised as an image
  // (MIME type is client-controlled and can be spoofed)
  if (file.type.startsWith("image/") || file.type === "application/pdf") {
    try {
      const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (header.length >= 4) {
        // Block files that start with script/HTML signatures despite claiming to be images
        const textStart = String.fromCharCode(...header.slice(0, 8));
        if (textStart.startsWith("<script") || textStart.startsWith("<html") || textStart.startsWith("<?php") || textStart.startsWith("#!/")) {
          return NextResponse.json({ error: "File content does not match its type." }, { status: 400 });
        }
      }
    } catch {
      // If we can't read bytes, skip this check
    }
  }

  // Require premium for real task/vendor attachments (not website or mood-board uploads)
  if (!isSyntheticUpload(entityId)) {
    const paywall = await requirePremium();
    if (paywall) return paywall;
  }

  // Verify the entity belongs to this wedding (skipped for synthetic IDs)
  const err = await verifyEntityOwnership(supabase, entityType, entityId, wedding.id);
  if (err) return err;

  // Upload to Supabase Storage
  // Convert File to ArrayBuffer for reliable server-side upload
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${wedding.id}/${entityType}/${entityId}/${Date.now()}_${file.name}`;

  let { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(fileName, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  // If bucket doesn't exist, create it and retry
  if (uploadError?.message?.includes("not found") || uploadError?.message?.includes("Bucket")) {
    await supabase.storage.createBucket("attachments", { public: false });
    const retry = await supabase.storage
      .from("attachments")
      .upload(fileName, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    uploadError = retry.error;
  }

  if (uploadError) {
    console.error("[ATTACHMENTS] Upload failed:", uploadError.message);
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Store the storage path (not a public URL) — signed URLs are generated on demand
  const storagePath = fileName;

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      wedding_id: wedding.id,
      entity_type: entityType as "task" | "vendor",
      entity_id: entityId,
      file_name: file.name,
      file_url: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Return a signed URL so callers (mood board, website) can use it immediately
  const { data: signed } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json(
    { ...data, file_url: signed?.signedUrl || storagePath },
    { status: 201 }
  );
}
