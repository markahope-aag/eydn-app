// Skeleton shell for the public wedding website. The couple's theme colors
// aren't available until the wedding row loads, so this uses neutral
// placeholder tones that match the default forest/blush palette without
// committing to the wrong colors if the couple has customized them.

export default function WeddingWebsiteLoading() {
  return (
    <div className="min-h-screen bg-whisper">
      {/* Hero placeholder — matches the height of both fullscreen and
          side-by-side hero layouts */}
      <div className="relative h-[60vh] min-h-[480px] bg-gradient-to-br from-[#2C3E2D] to-[#D4A5A5] animate-pulse">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
          <div className="h-12 w-72 max-w-full rounded bg-white/15" />
          <div className="h-5 w-40 max-w-full rounded bg-white/10" />
          <div className="h-4 w-56 max-w-full rounded bg-white/10" />
        </div>
      </div>

      {/* Sticky nav strip */}
      <div className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-4 overflow-hidden">
          {[60, 80, 70, 90, 60].map((w, i) => (
            <div key={i} className="h-4 rounded bg-lavender animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Section placeholders */}
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-16">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 w-48 mx-auto rounded bg-lavender animate-pulse" />
            <div className="h-px w-12 mx-auto bg-border" />
            <div className="space-y-2 mt-4">
              <div className="h-4 w-full rounded bg-lavender/60 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-lavender/60 animate-pulse" />
              <div className="h-4 w-4/6 rounded bg-lavender/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
