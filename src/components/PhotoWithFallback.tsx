"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

interface PhotoWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  /** Rendered in place of the image when it fails to load. Should fill the
   *  parent (the parent must be `relative` and sized) so the swap is seamless. */
  fallback: ReactNode;
}

/**
 * A `next/image` (unoptimized, `fill`) that swaps in `fallback` when the photo
 * fails to load. Google Places photos are proxied through /api/places-photo and
 * the proxied URL is cached on the vendor row for up to 30 days; when Google
 * rotates or expires the underlying photo reference the proxy 404s and the
 * browser would otherwise render its broken-image icon. Showing the placeholder
 * instead keeps the card looking intentional.
 *
 * Render the component inside a `relative`, explicitly-sized wrapper.
 */
export function PhotoWithFallback({ src, alt, className, fallback }: PhotoWithFallbackProps) {
  const [errored, setErrored] = useState(false);
  // Reset the error when the source changes (e.g. a lazily-resolved GMB photo
  // replaces a prior one) using React's adjust-state-during-render pattern
  // rather than an effect, which avoids a cascading re-render.
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrored(false);
  }

  if (errored) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
