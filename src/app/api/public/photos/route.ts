import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

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

  // Look up wedding by slug
  const { data: weddingRaw, error: weddingError } = await supabase
    .from("weddings")
    .select("id")
    .eq("website_slug", weddingSlug)
    .eq("website_enabled", true)
    .maybeSingle();

  const wedding = weddingRaw as { id: string } | null;

  if (weddingError || !wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  // Upload to Supabase storage
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${wedding.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("wedding-photos")
    .upload(fileName, buffer, {
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("wedding-photos")
    .getPublicUrl(fileName);

  // Create photo record
  const { error: photoError } = await supabase
    .from("wedding_photos")
    .insert({
      wedding_id: wedding.id,
      uploaded_by: "guest",
      uploader_name: uploaderName || "Anonymous",
      file_url: urlData.publicUrl,
      caption: caption || null,
      approved: false,
    });

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
