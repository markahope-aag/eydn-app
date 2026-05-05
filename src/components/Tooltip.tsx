"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
 * Usage:
 *   <Tooltip text="This is the total budget for your wedding." />
 *   <label>Budget <Tooltip text="Set your overall budget here." /></label>
 */
type Align = "left" | "center" | "right";

export function Tooltip({ text, wide, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(true);
  const [align, setAlign] = useState<Align>("center");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Tooltip widths come from the `wide` prop's Tailwind classes (w-56 / w-72).
  // Keep these in sync with the className below.
  const tooltipWidth = wide ? 288 : 224;
  const edgePadding = 8;

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Show below if too close to top of viewport.
    setAbove(rect.top > 120);

    // Horizontal alignment: default center, but if the trigger is close enough
    // to the right (or left) edge that a centered tooltip would clip, anchor
    // its corresponding edge to the trigger so the help text stays readable.
    const triggerCenter = rect.left + rect.width / 2;
    const halfTooltip = tooltipWidth / 2;
    if (triggerCenter + halfTooltip > window.innerWidth - edgePadding) {
      setAlign("right");
    } else if (triggerCenter - halfTooltip < edgePadding) {
      setAlign("left");
    } else {
      setAlign("center");
    }
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, reposition]);

  return (
    <span className="relative inline-flex items-center">
      {children}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => { reposition(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => { reposition(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        aria-label="Help"
        className="inline-flex items-center justify-center w-[16px] h-[16px] ml-1 rounded-full bg-lavender text-violet text-[10px] font-bold hover:bg-violet hover:text-white transition cursor-help flex-shrink-0"
      >
        ?
      </button>
      {open && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 ${wide ? "w-72" : "w-56"} px-3 py-2 text-[12px] leading-relaxed text-plum bg-white border border-border rounded-[10px] shadow-lg ${
            above ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            align === "center"
              ? "left-1/2 -translate-x-1/2"
              : align === "right"
              ? "right-0"
              : "left-0"
          }`}
        >
          {text}
          <div
            className={`absolute w-2 h-2 bg-white border-border rotate-45 ${
              above ? "bottom-[-5px] border-r border-b" : "top-[-5px] border-l border-t"
            } ${
              align === "center"
                ? "left-1/2 -translate-x-1/2"
                : align === "right"
                ? "right-2"
                : "left-2"
            }`}
          />
        </div>
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
