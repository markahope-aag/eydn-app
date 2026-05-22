import Link from "next/link";

interface GuideLinkProps {
  /** Guide slug, e.g. "speeches" — links to /dashboard/guides/<slug>. */
  slug: string;
  children: React.ReactNode;
  className?: string;
}

/** Inline link to a planning guide, for contextual help text. */
export function GuideLink({ slug, children, className = "" }: GuideLinkProps) {
  return (
    <Link
      href={`/dashboard/guides/${slug}`}
      className={`inline-flex items-center gap-1 font-semibold text-violet hover:text-plum transition ${className}`}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 3.6C8 3.6 6.6 2.6 3.6 2.6C3.3 2.6 3 2.85 3 3.2V11.9C3 12.25 3.3 12.5 3.6 12.5C6.6 12.5 8 13.5 8 13.5M8 3.6C8 3.6 9.4 2.6 12.4 2.6C12.7 2.6 13 2.85 13 3.2V11.9C13 12.25 12.7 12.5 12.4 12.5C9.4 12.5 8 13.5 8 13.5M8 3.6V13.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </Link>
  );
}
