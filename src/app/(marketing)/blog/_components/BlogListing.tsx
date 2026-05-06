import Image from "next/image";
import Link from "next/link";

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

export { CATEGORIES };
export type { Post };

export function BlogListing({
  posts,
  activeCategory,
}: {
  posts: Post[];
  activeCategory?: string;
}) {
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <main id="main-content" className="flex-1 bg-whisper">
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(165deg, #2C3E2D 0%, #1E2E1F 100%)",
          padding: "32px 24px 80px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Home link — sits above the hero, left-aligned for return-to-home */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto 64px",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Link
            href="/"
            aria-label="Back to Eydn home"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <Image
              src="/logo-white.png"
              alt="Eydn"
              width={104}
              height={26}
              style={{ height: 26, width: "auto", opacity: 0.85 }}
            />
          </Link>
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 18,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(250,246,241,0.78)",
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
          {activeCategory
            ? CATEGORIES.find((c) => c.value === activeCategory)?.label ?? "The Playbook"
            : "The Playbook"}
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 17,
            color: "rgba(250,246,241,0.85)",
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
            fontWeight: !activeCategory ? 600 : 400,
            color: !activeCategory ? "#FAF6F1" : "#2C3E2D",
            background: !activeCategory ? "#2C3E2D" : "transparent",
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
            href={`/blog/category/${c.value}`}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: activeCategory === c.value ? 600 : 400,
              color: activeCategory === c.value ? "#FAF6F1" : "#2C3E2D",
              background: activeCategory === c.value ? "#2C3E2D" : "transparent",
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
        {posts.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#6B5E50" }}>
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
              <div style={{ position: "relative", minHeight: 300 }}>
                <Image
                  src={featured.cover_image}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}
            <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6B5500",
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
                  color: "#6B5E50",
                  lineHeight: 1.65,
                  marginTop: 12,
                }}
              >
                {featured.excerpt}
              </p>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B5E50" }}>
                  {featured.author_name}
                </span>
                <span style={{ color: "#E8D5B7" }}>&middot;</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B5E50" }}>
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
            color: "rgba(250,246,241,0.78)",
            textDecoration: "none",
          }}
        >
          &larr; Back to eydn.app
        </Link>
        {/* Unsplash API guideline: when photos are displayed without per-image
            attribution, a site-wide credit line is required. Some Playbook
            covers use Unsplash photography; this satisfies that attribution. */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "rgba(250,246,241,0.7)",
            marginTop: 12,
          }}
        >
          Cover photos via{" "}
          <a
            href="https://unsplash.com/?utm_source=eydn-blog&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(250,246,241,0.85)", textDecoration: "underline" }}
          >
            Unsplash
          </a>
        </p>
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
        <div style={{ position: "relative", width: "100%", height: 200 }}>
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
      <div style={{ padding: "24px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#6B5500",
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
            color: "#6B5E50",
            lineHeight: 1.6,
            marginTop: 8,
            flex: 1,
          }}
        >
          {post.excerpt}
        </p>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6B5E50" }}>
            {post.read_time_minutes} min read
          </span>
          {post.published_at && (
            <>
              <span style={{ color: "#E8D5B7" }}>&middot;</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6B5E50" }}>
                {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
