"use client";

import Link from "next/link";

type EmptyStateProps = {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-lavender text-2xl">
        {icon}
      </div>
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
    </div>
  );
}
