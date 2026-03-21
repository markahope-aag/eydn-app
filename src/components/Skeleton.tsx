"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-lavender animate-pulse rounded-[10px] ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-[16px] border border-border bg-white p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[16px] border border-border bg-white px-4 py-3 flex items-center gap-3"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({
  count = 4,
  cols = 2,
}: {
  count?: number;
  cols?: number;
}) {
  return (
    <div
      className="gap-4 py-4"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
