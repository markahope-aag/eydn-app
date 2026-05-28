// Skeleton shell for a single blog article. Overrides the listing-grid
// loading.tsx at /blog so navigating from the listing to an article shows
// an article-shaped placeholder rather than another grid.

export default function BlogArticleLoading() {
  return (
    <div className="min-h-screen bg-whisper px-6 py-12">
      <article className="max-w-2xl mx-auto">
        {/* Meta */}
        <div className="space-y-3 mb-6">
          <div className="h-3 w-32 rounded bg-lavender animate-pulse" />
          <div className="h-10 w-full rounded bg-lavender animate-pulse" />
          <div className="h-10 w-4/5 rounded bg-lavender animate-pulse" />
          <div className="h-4 w-48 rounded bg-lavender/60 animate-pulse mt-4" />
        </div>

        {/* Cover image */}
        <div className="h-72 rounded-[16px] bg-lavender animate-pulse mb-10" />

        {/* Body */}
        <div className="space-y-3">
          {[100, 95, 90, 100, 75, 100, 90, 100, 85, 70].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded bg-lavender/40 animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </article>
    </div>
  );
}
