import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BlogListing, type Post } from "./_components/BlogListing";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "The Playbook — Wedding Planning Tips & Guides",
  description:
    "Expert wedding planning advice, tips, and guides from the Eydn team. Budgeting, timelines, vendor management, and everything in between.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    url: "/blog",
    title: "The Playbook — Wedding Planning Tips & Guides",
    description:
      "Expert wedding planning advice, tips, and guides from the Eydn team. Budgeting, timelines, vendor management, and everything in between.",
  },
};

export default async function BlogListingPage() {
  const supabase = createSupabaseAdmin();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, tags, cover_image, author_name, published_at, read_time_minutes")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return <BlogListing posts={(posts ?? []) as Post[]} />;
}
