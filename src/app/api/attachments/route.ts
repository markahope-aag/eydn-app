import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { requirePremium } from "@/lib/subscription";

// Synthetic entity IDs used by website and mood board uploads — not real DB records
const SYNTHETIC_IDS = new Set(["website-cover", "website-couple-photo", "mood-board"]);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
    await supabase.storage.createBucket("attachments", { public: true });
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

  const { data: urlData } = supabase.storage
    .from("attachments")
    .getPublicUrl(fileName);

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      wedding_id: wedding.id,
      entity_type: entityType as "task" | "vendor",
      entity_id: entityId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
