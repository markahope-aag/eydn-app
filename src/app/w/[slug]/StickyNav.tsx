"use client";

import { useState, useEffect } from "react";

type Section = { id: string; label: string };

export function StickyNav({ sections, coupleNames }: { sections: Section[]; coupleNames: string }) {
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    function onScroll() {
      setScrolled(window.scrollY > 100);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white/80 backdrop-blur-sm"
      } border-b border-border/50`}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-12">
        <span className="text-[14px] font-semibold text-plum whitespace-nowrap">
          {coupleNames}
        </span>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-full whitespace-nowrap transition ${
                active === s.id
                  ? "text-violet bg-lavender"
                  : "text-muted hover:text-plum"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
