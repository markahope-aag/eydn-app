"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-triggered reveal animation.
 *
 * Default behaviour: SSR renders the element with opacity:0 + offset, then JS
 * (post-hydration) either shows it immediately if already in the viewport or
 * waits for IntersectionObserver if below the fold.
 *
 * Pass `immediate` for above-the-fold content (e.g. the hero) — the element
 * renders visible from SSR, with no hide/reveal cycle. Critical for LCP: with
 * `immediate` off, the hero's opacity is 0 until JS hydrates, which PSI sees
 * as an LCP element render delay of several seconds.
 */
export function ScrollReveal({
  children,
  className = "",
  direction = "up",
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (immediate) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("sr-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const initialTransform =
    direction === "left"
      ? "translateX(-40px)"
      : direction === "right"
        ? "translateX(40px)"
        : "translateY(28px)";

  const hiddenStyle = {
    opacity: 0,
    transform: initialTransform,
    transition:
      "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
  } as const;

  return (
    <div
      ref={ref}
      className={`sr-reveal ${className}`}
      style={immediate ? undefined : hiddenStyle}
    >
      {children}
    </div>
  );
}
