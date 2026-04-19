import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BlogListing, CATEGORIES, type Post } from "../../_components/BlogListing";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.value === category);
  if (!cat) return { title: "Category Not Found" };

  const title = `${cat.label} — Wedding Planning Tips & Guides`;
  const description = `Wedding ${cat.label.toLowerCase()} advice, tips, and guides from the Eydn team.`;

  return {
    title,
    description,
    alternates: { canonical: `/blog/category/${category}` },
    openGraph: {
      url: `/blog/category/${category}`,
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: `${cat.label} wedding planning guides — Eydn` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: "/og-image.png", alt: `${cat.label} wedding planning guides — Eydn` }],
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.value === category);
  if (!cat) notFound();

  const supabase = createSupabaseAdmin();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, tags, cover_image, author_name, published_at, read_time_minutes")
    .eq("status", "published")
    .eq("category", category)
    .order("published_at", { ascending: false });

  return <BlogListing posts={(posts ?? []) as Post[]} activeCategory={category} />;
}
