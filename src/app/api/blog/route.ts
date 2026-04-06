import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { submitToIndexNow } from "@/lib/indexnow";

/** GET /api/blog — list published posts (public) or all posts (admin) */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdmin();
  const isAdminReq = request.nextUrl.searchParams.get("admin") === "true";

  if (isAdminReq) {
    const admin = await requireAdmin();
    if ("error" in admin) return admin.error;

    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, category, tags, status, published_at, read_time_minutes, created_at, updated_at, cover_image, author_name")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Public: only published posts
  const category = request.nextUrl.searchParams.get("category");
  let query = supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, tags, cover_image, author_name, published_at, read_time_minutes")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST /api/blog — create a new blog post (admin only) */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = await request.json();
  const { title, slug, excerpt, content, cover_image, category, tags, author_name, status, seo_title, seo_description, read_time_minutes } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
  }

  // Auto-generate slug from title if not provided
  const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const { data, error } = await admin.supabase
    .from("blog_posts")
    .insert({
      title,
      slug: finalSlug,
      excerpt: excerpt || "",
      content: content || "",
      cover_image: cover_image || null,
      category: category || "planning",
      tags: tags || [],
      author_name: author_name || "Eydn Team",
      status: status || "draft",
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      read_time_minutes: read_time_minutes || Math.max(1, Math.ceil((content || "").split(/\s+/).length / 200)),
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Submit to IndexNow when a post is published immediately
  if (status === "published") {
    submitToIndexNow([`/blog/${finalSlug}`, "/blog"]);
  }

  return NextResponse.json(data, { status: 201 });
}
