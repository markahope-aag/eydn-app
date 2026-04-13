"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

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
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  read_time_minutes: number;
  created_at: string;
  updated_at: string;
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

const EMPTY_POST: Omit<Post, "id" | "created_at" | "updated_at"> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: null,
  category: "planning",
  tags: [],
  author_name: "Eydn Team",
  status: "draft",
  published_at: null,
  seo_title: null,
  seo_description: null,
  read_time_minutes: 5,
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_POST);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [blogSearch, setBlogSearch] = useState("");
  const [blogSort, setBlogSort] = useState<"newest" | "oldest" | "title">("newest");
  const [uploadingImage, setUploadingImage] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (form.slug || form.title) {
        fd.append("slug", form.slug || form.title);
      }

      const res = await fetch("/api/blog/upload-image", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };

      const tag = `<img src="${url}" alt="${file.name.replace(/\.[^.]+$/, "")}" loading="lazy" />`;
      const textarea = contentRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? form.content.length;
        const end = textarea.selectionEnd ?? form.content.length;
        const next = form.content.slice(0, start) + tag + form.content.slice(end);
        setForm((f) => ({
          ...f,
          content: next,
          cover_image: f.cover_image || url,
        }));
        requestAnimationFrame(() => {
          textarea.focus();
          const pos = start + tag.length;
          textarea.setSelectionRange(pos, pos);
        });
      } else {
        setForm((f) => ({
          ...f,
          content: f.content + "\n" + tag,
          cover_image: f.cover_image || url,
        }));
      }

      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard not available — not fatal
      }

      toast.success("Image uploaded. Tag inserted and URL copied.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog?admin=true");
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      setPosts(data);
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_POST);
    setTagsInput("");
  }

  function startEdit(post: Post) {
    setCreating(false);
    setEditing(post);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover_image: post.cover_image,
      category: post.category,
      tags: post.tags,
      author_name: post.author_name,
      status: post.status,
      published_at: post.published_at,
      seo_title: post.seo_title,
      seo_description: post.seo_description,
      read_time_minutes: post.read_time_minutes,
    });
    setTagsInput(post.tags.join(", "));
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      slug: form.slug || autoSlug(form.title),
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    };

    try {
      if (creating) {
        const res = await fetch("/api/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create");
        }
        toast.success("Post created");
      } else if (editing) {
        const res = await fetch(`/api/blog/${editing.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update");
        }
        toast.success("Post updated");
      }
      setCreating(false);
      setEditing(null);
      fetchPosts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm("Delete this post permanently?")) return;
    try {
      const res = await fetch(`/api/blog/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Post deleted");
      if (editing?.slug === slug) {
        setEditing(null);
        setCreating(false);
      }
      fetchPosts();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const isEditorOpen = creating || editing;

  const filteredPosts = posts
    .filter((post) => {
      if (!blogSearch.trim()) return true;
      const q = blogSearch.toLowerCase();
      return post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (blogSort === "newest") {
        const da = a.published_at || a.created_at;
        const db = b.published_at || b.created_at;
        return new Date(db).getTime() - new Date(da).getTime();
      }
      if (blogSort === "oldest") {
        const da = a.published_at || a.created_at;
        const db = b.published_at || b.created_at;
        return new Date(da).getTime() - new Date(db).getTime();
      }
      return a.title.localeCompare(b.title);
    });

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--deep-plum)" }}>The Playbook — Blog CMS</h1>
          <p style={{ fontSize: 14, color: "var(--muted-plum)", marginTop: 4 }}>
            Create and manage blog posts for SEO and content marketing.
          </p>
        </div>
        <button
          onClick={startCreate}
          style={{
            background: "var(--violet)",
            color: "#FAF6F1",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Post
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isEditorOpen ? "340px 1fr" : "1fr", gap: 24 }}>
        {/* Post list */}
        <div>
          {loading ? (
            <p style={{ color: "var(--muted-plum)", fontSize: 14, padding: 20 }}>Loading posts...</p>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14, color: "var(--muted-plum)" }}>No posts yet. Create your first article!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <input
                  placeholder="Search posts..."
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  style={{ flex: 1, borderRadius: 10, border: "1px solid var(--border)", padding: "8px 12px", fontSize: 14 }}
                />
                <select
                  value={blogSort}
                  onChange={(e) => setBlogSort(e.target.value as "newest" | "oldest" | "title")}
                  style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "8px 12px", fontSize: 14 }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => startEdit(post)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: editing?.id === post.id ? "var(--lavender-mist)" : "var(--surface)",
                    border: `1px solid ${editing?.id === post.id ? "var(--violet)" : "var(--border)"}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: post.status === "published" ? "var(--confirmed-text)" : post.status === "draft" ? "var(--pending-text)" : "var(--muted-plum)",
                        background: post.status === "published" ? "var(--confirmed-bg)" : post.status === "draft" ? "var(--pending-bg)" : "var(--lavender-mist)",
                        borderRadius: 100,
                        padding: "2px 8px",
                      }}
                    >
                      {post.status}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted-plum)" }}>
                      {CATEGORIES.find((c) => c.value === post.category)?.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--deep-plum)", lineHeight: 1.3 }}>
                    {post.title}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted-plum)", marginTop: 2 }}>
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Not published"}{" "}
                    &middot; {post.read_time_minutes} min
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        {isEditorOpen && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 28,
              overflowY: "auto",
              maxHeight: "calc(100vh - 200px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--deep-plum)" }}>
                {creating ? "New Post" : "Edit Post"}
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                {editing && (
                  <button
                    onClick={() => handleDelete(editing.slug)}
                    style={{
                      background: "var(--declined-bg)",
                      color: "var(--declined-text)",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => { setEditing(null); setCreating(false); }}
                  style={{
                    background: "var(--lavender-mist)",
                    color: "var(--deep-plum)",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: creating ? autoSlug(e.target.value) : f.slug,
                    }));
                  }}
                  placeholder="Your article title"
                  style={inputStyle}
                />
              </div>

              {/* Slug */}
              <div>
                <label style={labelStyle}>Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="url-friendly-slug"
                  style={inputStyle}
                />
              </div>

              {/* Row: Category + Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    style={inputStyle}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Author + Cover image */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Author</label>
                  <input
                    type="text"
                    value={form.author_name}
                    onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Cover Image URL</label>
                  <input
                    type="text"
                    value={form.cover_image || ""}
                    onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value || null }))}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label style={labelStyle}>Excerpt</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Brief summary for cards and SEO"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Content (HTML) */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Content (HTML)</label>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      style={{
                        fontSize: 12,
                        padding: "6px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: uploadingImage ? "var(--lavender)" : "white",
                        color: "var(--plum)",
                        cursor: uploadingImage ? "default" : "pointer",
                      }}
                    >
                      {uploadingImage ? "Uploading…" : "＋ Upload image"}
                    </button>
                  </div>
                </div>
                <textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="<p>Write your article here using HTML...</p>"
                  rows={16}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
                />
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  Click Upload image to add a file. The image tag is inserted at your cursor, the URL is copied to your clipboard, and if there&apos;s no cover image yet, it&apos;s set as the cover.
                </p>
              </div>

              {/* Tags */}
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="wedding planning, budget tips, vendor advice"
                  style={inputStyle}
                />
              </div>

              {/* SEO */}
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: "var(--deep-plum)", cursor: "pointer" }}>
                  SEO Settings
                </summary>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>SEO Title</label>
                    <input
                      type="text"
                      value={form.seo_title || ""}
                      onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value || null }))}
                      placeholder="Custom SEO title (defaults to post title)"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>SEO Description</label>
                    <textarea
                      value={form.seo_description || ""}
                      onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value || null }))}
                      placeholder="Custom meta description (defaults to excerpt)"
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                </div>
              </details>

              {/* Save */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: "var(--violet)",
                    color: "#FAF6F1",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 28px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Saving..." : creating ? "Create Post" : "Save Changes"}
                </button>
                {editing && form.status !== "published" && (
                  <button
                    onClick={() => {
                      setForm((f) => ({ ...f, status: "published" }));
                      setTimeout(handleSave, 0);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #D4A5A5, #C08080)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 28px",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Publish Now
                  </button>
                )}
                {editing && (
                  <a
                    href={`/blog/${editing.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 13,
                      color: "var(--violet)",
                      textDecoration: "none",
                      padding: "12px 16px",
                    }}
                  >
                    Preview &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-plum)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--deep-plum)",
  background: "var(--background)",
  outline: "none",
};
