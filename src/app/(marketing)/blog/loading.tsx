// Skeleton shell for the blog index and blog category routes. The category
// page is nested under /blog so it inherits this loading fallback
// automatically — both surfaces have the same listing grid layout.

export default function BlogListingLoading() {
  return (
    <div className="min-h-screen bg-whisper px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Title placeholder */}
        <div className="text-center mb-12 space-y-3">
          <div className="h-3 w-32 mx-auto rounded bg-lavender animate-pulse" />
          <div className="h-10 w-80 max-w-full mx-auto rounded bg-lavender animate-pulse" />
          <div className="h-4 w-96 max-w-full mx-auto rounded bg-lavender/60 animate-pulse" />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap justify-center mb-10">
          {[70, 90, 110, 80, 100, 75].map((w, i) => (
            <div key={i} className="h-8 rounded-full bg-lavender animate-pulse" style={{ width: w }} />
          ))}
        </div>

        {/* Post cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-[16px] border border-border bg-white overflow-hidden">
              <div className="h-44 bg-lavender animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-24 rounded bg-lavender/60 animate-pulse" />
                <div className="h-5 w-full rounded bg-lavender animate-pulse" />
                <div className="h-5 w-3/4 rounded bg-lavender animate-pulse" />
                <div className="space-y-1.5 pt-2">
                  <div className="h-3 w-full rounded bg-lavender/40 animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-lavender/40 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
