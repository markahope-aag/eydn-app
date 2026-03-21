import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { requirePremium } from "@/lib/subscription";

export async function GET(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entity_type");
  const entityId = url.searchParams.get("entity_id");

  // If requesting attachments for a specific entity, verify it belongs to this wedding
  if (entityType && entityId) {
    if (entityType === "task") {
      const { data: task } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", entityId)
        .eq("wedding_id", wedding.id)
        .single();
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
    } else if (entityType === "vendor") {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("id", entityId)
        .eq("wedding_id", wedding.id)
        .single();
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }
    }
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

  // Require premium for task/vendor attachments (not website or mood-board uploads)
  const freeUploadIds = ["website-cover", "website-couple-photo", "mood-board"];
  if (!freeUploadIds.includes(entityId)) {
    const paywall = await requirePremium();
    if (paywall) return paywall;
  }

  // Verify the entity belongs to this wedding
  if (entityType === "task") {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", entityId)
      .eq("wedding_id", wedding.id)
      .single();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  } else if (entityType === "vendor") {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("id", entityId)
      .eq("wedding_id", wedding.id)
      .single();
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
  }

  // Upload to Supabase Storage
  const fileName = `${wedding.id}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(fileName, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
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
