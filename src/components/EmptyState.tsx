"use client";

import Link from "next/link";
import Image from "next/image";
import { EMPTY_STATE_IMAGES, type EmptyStateImageKey } from "@/lib/empty-state-images";

type EmptyStateProps = {
  /** Decorative emoji shown in a small lavender circle. Used as a fallback
   *  when no `image` is supplied. */
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  /** Optional Unsplash image to render above the title. When set, the
   *  component renders a soft 16:9 thumbnail in place of the icon circle and
   *  shows tiny photographer credit beneath the message. */
  image?: EmptyStateImageKey;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
  image,
}: EmptyStateProps) {
  const photo = image ? EMPTY_STATE_IMAGES[image] : null;

  return (
    <div className="flex flex-col items-center justify-center py-10">
      {photo ? (
        <div className="relative w-full max-w-xl aspect-[16/9] rounded-[20px] overflow-hidden border border-border/60 shadow-sm">
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="(min-width: 768px) 576px, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-lavender text-2xl">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-[17px] font-semibold text-plum">{title}</h3>
      <p className="mt-1 text-[15px] text-muted text-center max-w-sm">
        {message}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-4">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} className="btn-primary mt-4">
          {actionLabel}
        </button>
      )}
      {photo && (
        <p className="mt-3 text-[11px] text-muted/80">
          Photo by{" "}
          <a
            href={photo.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet"
          >
            {photo.photographer}
          </a>{" "}
          on{" "}
          <a
            href={photo.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet"
          >
            Unsplash
          </a>
        </p>
      )}
    </div>
  );
}
