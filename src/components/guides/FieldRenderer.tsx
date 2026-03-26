"use client";

import type { FieldType } from "@/lib/guides/types";

type Props = {
  field: FieldType;
  value: unknown;
  onChange: (_value: unknown) => void;
};

export function FieldRenderer({ field, value, onChange }: Props) {
  switch (field.kind) {
    case "number":
      return (
        <div className="flex items-center gap-2">
          {field.unit && <span className="text-muted text-[14px]">{field.unit}</span>}
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder || "0"}
            min={field.min}
            max={field.max}
            className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          />
        </div>
      );

    case "text":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
        />
      );

    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={field.placeholder}
          rows={field.rows || 3}
          className="w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
        />
      );

    case "time":
      return (
        <input
          type="time"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
        />
      );

    case "select":
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(value === opt.value ? null : opt.value)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition ${
                value === opt.value
                  ? "bg-violet text-white"
                  : "bg-lavender text-violet hover:bg-violet hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );

    case "multi-select": {
      const selected = (value as string[]) || [];
      const max = field.max;
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            const atMax = max != null && selected.length >= max && !isSelected;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={atMax}
                onClick={() => {
                  if (isSelected) {
                    onChange(selected.filter((v) => v !== opt.value));
                  } else {
                    onChange([...selected, opt.value]);
                  }
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition ${
                  isSelected
                    ? "bg-violet text-white"
                    : atMax
                    ? "bg-whisper text-muted cursor-not-allowed"
                    : "bg-lavender text-violet hover:bg-violet hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          {max != null && (
            <p className="w-full text-[11px] text-muted mt-1">
              {selected.length}/{max} selected
            </p>
          )}
        </div>
      );
    }

    case "scale": {
      const numValue = (value as number) ?? null;
      return (
        <div>
          <div className="flex gap-1">
            {Array.from({ length: field.max - field.min + 1 }, (_, i) => {
              const n = field.min + i;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`flex-1 py-2 rounded-[10px] text-[14px] font-semibold transition ${
                    numValue === n
                      ? "bg-violet text-white"
                      : "bg-lavender text-violet hover:bg-violet hover:text-white"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(field.minLabel || field.maxLabel) && (
            <div className="flex justify-between mt-1 text-[11px] text-muted">
              <span>{field.minLabel || ""}</span>
              <span>{field.maxLabel || ""}</span>
            </div>
          )}
        </div>
      );
    }
  }
}
