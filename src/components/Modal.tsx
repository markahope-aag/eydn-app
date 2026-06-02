"use client";

import { useEffect, useCallback, useRef, useId, type ReactNode, type RefObject } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (wired to aria-labelledby). */
  title: string;
  /** Optional supporting copy under the title (wired to aria-describedby). */
  description?: ReactNode;
  children?: ReactNode;
  /** Optional footer row; the caller controls its inner layout. */
  footer?: ReactNode;
  /** Optional content rendered in the header, left of the close button. */
  headerAction?: ReactNode;
  size?: ModalSize;
  /** Render the title for screen readers only — for image/preview dialogs. */
  titleVisuallyHidden?: boolean;
  /** Element to focus when the dialog opens (defaults to the close button). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Extra classes on the panel. */
  className?: string;
  /**
   * Extra classes on the full-screen overlay — mainly to raise the z-index when
   * a dialog must stack above another open dialog (defaults to z-50).
   */
  overlayClassName?: string;
}

/**
 * Accessible modal dialog. Extracted from the original ConfirmDialog so every
 * dashboard modal shares the same focus trap, Escape-to-close, aria-modal /
 * aria-labelledby wiring, body-scroll lock, and backdrop-click dismissal.
 *
 * Layout is a flex column: the header and footer stay pinned while the body
 * scrolls, so long forms keep their actions visible.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  headerAction,
  size = "md",
  titleVisuallyHidden = false,
  initialFocusRef,
  className = "",
  overlayClassName = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reactId = useId();
  const titleId = `modal-title-${reactId}`;
  const descId = `modal-desc-${reactId}`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? closeRef.current)?.focus();
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, handleKeyDown, initialFocusRef]);

  if (!open) return null;

  const hasBody = children !== undefined && children !== null && children !== false;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${overlayClassName}`}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`bg-white rounded-[16px] shadow-2xl w-full ${SIZE_CLASS[size]} max-h-[calc(100vh-2rem)] flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 shrink-0">
          <div className={titleVisuallyHidden ? "sr-only" : "min-w-0"}>
            <h2 id={titleId} className="text-[18px] font-semibold text-plum">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-[14px] text-muted">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center text-muted hover:bg-lavender/50 hover:text-plum transition text-[20px] leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {hasBody && <div className="px-6 pb-6 overflow-y-auto flex-1">{children}</div>}

        {footer && (
          <div className="px-6 py-4 border-t border-border bg-whisper rounded-b-[16px] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
