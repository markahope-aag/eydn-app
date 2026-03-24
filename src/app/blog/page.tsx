import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/server";

// Revalidate blog listing every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: "The Playbook — Wedding Planning Tips & Guides",
  description:
    "Expert wedding planning advice, tips, and guides from the Eydn team. Budgeting, timelines, vendor management, and everything in between.",
  alternates: {
    canonical: "/blog",
  },
};

const CATEGORIES = [
  { value: "planning", label: "Planning" },
  { value: "budget", label: "Budget" },
  { value: "vendors", label: "Vendors" },
  { value: "design", label: "Design & Decor" },
  { value: "day-of", label: "Day-of" },
  { value: "relationships", label: "Relationships" },
  { value: "real-weddings", label: "Real Weddings" },
];

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  cover_image: string | null;
  author_name: string;
  published_at: string | null;
  read_time_minutes: number;
};

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, tags, cover_image, author_name, published_at, read_time_minutes")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (sp.category) {
    query = query.eq("category", sp.category);
  }

  const { data: posts } = await query;
  const allPosts: Post[] = posts || [];

  const featured = allPosts[0];
  const rest = allPosts.slice(1);

  return (
    <main className="flex-1 bg-whisper">
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(165deg, #2C3E2D 0%, #1E2E1F 100%)",
          padding: "120px 24px 80px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 18,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(250,246,241,0.5)",
          }}
        >
          eydn
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 72,
            fontWeight: 600,
            color: "#FAF6F1",
            lineHeight: 1.05,
            marginTop: 8,
          }}
          className="max-md:!text-[48px]"
        >
          The Playbook
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 17,
            color: "rgba(250,246,241,0.6)",
            marginTop: 16,
            maxWidth: 520,
            marginInline: "auto",
            lineHeight: 1.65,
          }}
        >
          Expert advice, real stories, and actionable guides to help you plan a wedding you will love.
        </p>
      </section>

      {/* Category pills */}
      <div
        style={{
          background: "#FAF6F1",
          borderBottom: "1px solid #E8D5B7",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/blog"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: !sp.category ? 600 : 400,
            color: !sp.category ? "#FAF6F1" : "#2C3E2D",
            background: !sp.category ? "#2C3E2D" : "transparent",
            border: "1px solid #2C3E2D",
            borderRadius: 100,
            padding: "6px 16px",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/blog?category=${c.value}`}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: sp.category === c.value ? 600 : 400,
              color: sp.category === c.value ? "#FAF6F1" : "#2C3E2D",
              background: sp.category === c.value ? "#2C3E2D" : "transparent",
              border: "1px solid #2C3E2D",
              borderRadius: 100,
              padding: "6px 16px",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Posts */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 120px" }}>
        {allPosts.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#8A7A6A" }}>
              No articles yet. Check back soon!
            </p>
          </div>
        )}

        {/* Featured post */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            style={{
              display: "grid",
              gridTemplateColumns: featured.cover_image ? "1fr 1fr" : "1fr",
              gap: 0,
              borderRadius: 16,
              overflow: "hidden",
              background: "#F7EDED",
              textDecoration: "none",
              marginBottom: 48,
              transition: "transform 300ms, box-shadow 300ms",
            }}
            className="max-md:!grid-cols-1"
          >
            {featured.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.cover_image}
                alt={featured.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 300 }}
              />
            )}
            <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#C9A84C",
                }}
              >
                Featured &middot; {CATEGORIES.find((c) => c.value === featured.category)?.label || featured.category}
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: 36,
                  fontWeight: 600,
                  color: "#2A2018",
                  lineHeight: 1.15,
                  marginTop: 12,
                }}
              >
                {featured.title}
              </h2>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#8A7A6A",
                  lineHeight: 1.65,
                  marginTop: 12,
                }}
              >
                {featured.excerpt}
              </p>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8A7A6A" }}>
                  {featured.author_name}
                </span>
                <span style={{ color: "#E8D5B7" }}>&middot;</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8A7A6A" }}>
                  {featured.read_time_minutes} min read
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Grid of posts */}
        {rest.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 28,
            }}
            className="max-lg:!grid-cols-2 max-sm:!grid-cols-1"
          >
            {rest.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* Simple footer */}
      <footer style={{ background: "#1A1A2E", padding: "40px 24px", textAlign: "center" }}>
        <Link
          href="/"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "rgba(250,246,241,0.5)",
            textDecoration: "none",
          }}
        >
          &larr; Back to eydn.app
        </Link>
      </footer>
    </main>
  );
}

function BlogCard({ post }: { post: Post }) {
  const catLabel = CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #E8D5B7",
        textDecoration: "none",
        transition: "transform 300ms, box-shadow 300ms",
      }}
    >
      {post.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image}
          alt={post.title}
          style={{ width: "100%", height: 200, objectFit: "cover" }}
        />
      )}
      <div style={{ padding: "24px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#C9A84C",
          }}
        >
          {catLabel}
        </span>
        <h3
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 22,
            fontWeight: 600,
            color: "#2A2018",
            lineHeight: 1.25,
            marginTop: 8,
          }}
        >
          {post.title}
        </h3>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#8A7A6A",
            lineHeight: 1.6,
            marginTop: 8,
            flex: 1,
          }}
        >
          {post.excerpt}
        </p>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8A7A6A" }}>
            {post.read_time_minutes} min read
          </span>
          {post.published_at && (
            <>
              <span style={{ color: "#E8D5B7" }}>&middot;</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8A7A6A" }}>
                {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
