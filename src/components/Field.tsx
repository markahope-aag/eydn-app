"use client";

import { useId, cloneElement, type ReactNode, type ReactElement } from "react";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Hide the label visually but keep it available to screen readers. */
  labelHidden?: boolean;
  className?: string;
  /**
   * Either a single form control (input/select/textarea) — which is cloned
   * with a generated `id` and aria wiring — or a render function that receives
   * the ids to spread onto a custom control.
   */
  children: ReactElement<ControlProps> | ((props: ControlProps) => ReactNode);
}

/**
 * Labelled form field. Generates a stable id, renders a `<label htmlFor>` tied
 * to the control, and wires `aria-describedby` / `aria-invalid` for hint and
 * error text — so every field has a programmatic label and accessible status.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  labelHidden = false,
  className = "",
  children,
}: FieldProps) {
  const reactId = useId();
  const id = `field-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const controlProps: ControlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  const control =
    typeof children === "function" ? children(controlProps) : cloneElement(children, controlProps);

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`block text-[13px] font-medium text-plum mb-1 ${labelHidden ? "sr-only" : ""}`}
      >
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-[12px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-[12px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
