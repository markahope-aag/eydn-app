"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  /** The help text to display */
  text: string;
  /** Optional wider width for longer text */
  wide?: boolean;
  /** Inline with a label — renders as a small ? icon */
  children?: React.ReactNode;
};

/**
 * Contextual help tooltip. Shows a ? icon that reveals help text on hover/click.
 *
 * The bubble is rendered through a portal with viewport-clamped positioning,
 * so it never gets clipped by an `overflow: hidden` ancestor (cards, panels)
 * and never overflows the left or right edge of the screen.
 *
 * Usage:
 *   <Tooltip text="This is the total budget for your wedding." />
 *   <label>Budget <Tooltip text="Set your overall budget here." /></label>
 */
type Coords = {
  left: number;
  top?: number;
  bottom?: number;
  arrowLeft: number;
  above: boolean;
};

const EDGE_PADDING = 8;

export function Tooltip({ text, wide, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Width comes from the `wide` prop's Tailwind class (w-56 / w-72).
  // Keep these in sync with the className below.
  const tooltipWidth = wide ? 288 : 224;

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const triggerCenter = rect.left + rect.width / 2;

    // Centre the bubble on the trigger, then clamp so it never overflows
    // either edge of the viewport.
    const maxLeft = window.innerWidth - tooltipWidth - EDGE_PADDING;
    const left = Math.max(
      EDGE_PADDING,
      Math.min(triggerCenter - tooltipWidth / 2, maxLeft)
    );

    // Flip below the trigger when there isn't room above it.
    const above = rect.top > 120;

    // Arrow points back at the trigger, kept within the bubble's rounded ends.
    const arrowLeft = Math.max(14, Math.min(triggerCenter - left, tooltipWidth - 14));

    setCoords({
      left,
      top: above ? undefined : rect.bottom + 8,
      bottom: above ? window.innerHeight - rect.top + 8 : undefined,
      arrowLeft,
      above,
    });
  }, [tooltipWidth]);

  useEffect(() => {
    if (!open) return;
    reposition();

    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    // The bubble is viewport-positioned, so re-place it as the page moves.
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  return (
    <span className="inline-flex items-center">
      {children}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            reposition();
            setOpen(true);
          }
        }}
        onMouseEnter={() => { reposition(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => { reposition(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        aria-label="Help"
        className="inline-flex items-center justify-center w-[16px] h-[16px] ml-1 rounded-full bg-lavender text-violet text-[10px] font-bold hover:bg-violet hover:text-white transition cursor-help flex-shrink-0"
      >
        ?
      </button>
      {open && coords && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ left: coords.left, top: coords.top, bottom: coords.bottom }}
          className={`fixed z-[100] ${wide ? "w-72" : "w-56"} px-3 py-2 text-[12px] leading-relaxed text-plum bg-white border border-border rounded-[10px] shadow-lg`}
        >
          {text}
          <div
            style={{ left: coords.arrowLeft }}
            className={`absolute w-2 h-2 -translate-x-1/2 bg-white border-border rotate-45 ${
              coords.above ? "bottom-[-5px] border-r border-b" : "top-[-5px] border-l border-t"
            }`}
          />
        </div>,
        document.body
      )}
    </span>
  );
}

/**
 * A label with an integrated tooltip.
 * Convenience wrapper for the common pattern of label + help icon.
 *
 * Usage:
 *   <HelpLabel label="Budget" tooltip="Your total wedding budget." />
 */
export function HelpLabel({
  label,
  tooltip,
  wide,
  className,
}: {
  label: string;
  tooltip: string;
  wide?: boolean;
  className?: string;
}) {
  return (
    <label className={className || "text-[12px] font-semibold text-muted"}>
      {label}
      <Tooltip text={tooltip} wide={wide} />
    </label>
  );
}
