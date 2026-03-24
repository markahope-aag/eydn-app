import type { MetadataRoute } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";

// Revalidate sitemap every hour
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://eydn.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/beta`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/cookies`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/disclaimer`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/acceptable-use`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/accessibility`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Blog posts
  const supabase = createSupabaseAdmin();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const blogPages: MetadataRoute.Sitemap = (posts || []).map((post) => ({
    url: `${baseUrl}/blog/${(post as { slug: string }).slug}`,
    lastModified: new Date((post as { updated_at?: string; published_at: string }).updated_at || (post as { published_at: string }).published_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
