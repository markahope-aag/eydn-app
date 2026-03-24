import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  status: string;
  published_at: string;
  seo_title: string | null;
  seo_description: string | null;
  read_time_minutes: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, seo_title, seo_description, cover_image")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.seo_description || post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.seo_description || post.excerpt,
      ...(post.cover_image && { images: [post.cover_image] }),
    },
  };
}

const CATEGORIES: Record<string, string> = {
  planning: "Planning",
  budget: "Budget",
  vendors: "Vendors",
  "design": "Design & Decor",
  "day-of": "Day-of",
  relationships: "Relationships",
  "real-weddings": "Real Weddings",
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) notFound();

  const p = post as Post;

  // Fetch related posts (same category, excluding current)
  const { data: related } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, read_time_minutes, cover_image, published_at")
    .eq("status", "published")
    .eq("category", p.category)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <main className="flex-1 bg-whisper">
      {/* Nav bar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(250,246,241,0.96)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #E8D5B7",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="eydn" style={{ height: 22 }} />
        </Link>
        <Link
          href="/blog"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#2C3E2D",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          The Playbook
        </Link>
      </nav>

      {/* Article */}
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 80px" }}>
        {/* Category & meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Link
            href={`/blog?category=${p.category}`}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#C9A84C",
              textDecoration: "none",
            }}
          >
            {CATEGORIES[p.category] || p.category}
          </Link>
          <span style={{ color: "#E8D5B7" }}>&middot;</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8A7A6A" }}>
            {p.read_time_minutes} min read
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 52,
            fontWeight: 600,
            color: "#2A2018",
            lineHeight: 1.1,
          }}
          className="max-md:!text-[36px]"
        >
          {p.title}
        </h1>

        {/* Author & date */}
        <div style={{ marginTop: 24, paddingBottom: 32, borderBottom: "1px solid #E8D5B7", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2C3E2D, #3A5240)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FAF6F1",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {p.author_name.charAt(0)}
          </div>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#2A2018" }}>
              {p.author_name}
            </p>
            {p.published_at && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8A7A6A" }}>
                {new Date(p.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Content — rendered as HTML */}
        <div
          className="blog-content"
          style={{ marginTop: 40 }}
          dangerouslySetInnerHTML={{ __html: p.content }}
        />

        {/* Tags */}
        {p.tags.length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #E8D5B7", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {p.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "#2C3E2D",
                  background: "#F3EAE0",
                  borderRadius: 100,
                  padding: "4px 12px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Related posts */}
      {related && related.length > 0 && (
        <section style={{ background: "#F7EDED", padding: "80px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: 32,
                fontWeight: 600,
                color: "#2A2018",
                textAlign: "center",
                marginBottom: 40,
              }}
            >
              Keep reading
            </h2>
            <div
              style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(related.length, 3)}, 1fr)`, gap: 24 }}
              className="max-md:!grid-cols-1"
            >
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#fff",
                    border: "1px solid #E8D5B7",
                    textDecoration: "none",
                  }}
                >
                  {r.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover_image} alt={r.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                  )}
                  <div style={{ padding: "20px 16px" }}>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#2A2018",
                        lineHeight: 1.25,
                      }}
                    >
                      {r.title}
                    </h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8A7A6A", marginTop: 8, lineHeight: 1.5 }}>
                      {r.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ background: "#2C3E2D", padding: "80px 24px", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 40,
            fontWeight: 600,
            color: "#FAF6F1",
            lineHeight: 1.1,
          }}
        >
          Ready to start planning?
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(250,246,241,0.6)", marginTop: 12 }}>
          Join thousands of couples using Eydn to plan their perfect day.
        </p>
        <Link
          href="/sign-up"
          style={{
            display: "inline-block",
            marginTop: 28,
            background: "linear-gradient(135deg, #D4A5A5, #C08080)",
            color: "#fff",
            borderRadius: 100,
            padding: "14px 36px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Start Planning Today
        </Link>
      </section>
    </main>
  );
}
