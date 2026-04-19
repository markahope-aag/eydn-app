import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { submitToIndexNow } from "@/lib/indexnow";
import { sanitizeBlogContent } from "@/lib/blog/sanitize";

/** GET /api/blog/[slug] — get a single post */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

/** PATCH /api/blog/[slug] — update a post (admin only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  const allowedFields = [
    "title", "slug", "excerpt", "content", "cover_image", "category",
    "tags", "author_name", "status", "seo_title", "seo_description", "read_time_minutes",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  // Sanitize content on write so the DB can never hold raw XSS payloads.
  if ("content" in updates) {
    updates.content = sanitizeBlogContent(updates.content as string | null | undefined);
  }

  // Auto-set published_at when publishing for the first time
  if (body.status === "published" && !body.published_at) {
    updates.published_at = new Date().toISOString();
  }

  // Auto-calculate read time if content changes
  if (updates.content && !body.read_time_minutes) {
    updates.read_time_minutes = Math.max(1, Math.ceil((updates.content as string).split(/\s+/).length / 200));
  }

  const { data, error } = await admin.supabase
    .from("blog_posts")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Submit to IndexNow when a published post is updated
  const finalSlug = (data as { slug: string }).slug;
  const finalStatus = (data as { status: string }).status;
  if (finalStatus === "published") {
    submitToIndexNow([`/blog/${finalSlug}`, "/blog"]);
  }

  return NextResponse.json(data);
}

/** DELETE /api/blog/[slug] — delete a post (admin only) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { error } = await admin.supabase
    .from("blog_posts")
    .delete()
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
