"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { DayOfPlan } from "./types";

interface AttireTabProps {
  plan: DayOfPlan;
  savePlan: (updated: DayOfPlan) => void;
}

export function AttireTab({ plan, savePlan }: AttireTabProps) {
  const attirePhotoRef = useRef<HTMLInputElement>(null);
  const attirePhotoIndex = useRef<number | null>(null);

  return (
    <div className="mt-4">
      <p className="text-[13px] text-muted mb-4">
        Document what each person is wearing. Add photos of outfits, accessories, and details.
      </p>
      <div className="space-y-3">
        {plan.attire.map((item, i) => (
          <div key={i} className="card p-4 flex gap-4">
            {item.photoUrl ? (
              <div className="w-20 h-20 rounded-[12px] overflow-hidden flex-shrink-0 relative cursor-pointer group"
                onClick={() => {
                  attirePhotoIndex.current = i;
                  attirePhotoRef.current?.click();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.photoUrl} alt={item.person || "Attire"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="text-white text-[10px] font-semibold">Change</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  attirePhotoIndex.current = i;
                  attirePhotoRef.current?.click();
                }}
                className="w-20 h-20 rounded-[12px] bg-lavender flex items-center justify-center flex-shrink-0 hover:bg-violet transition group"
              >
                <span className="text-[24px] text-violet group-hover:text-white">+</span>
              </button>
            )}
            <div className="flex-1 space-y-2">
              <input
                type="text"
                defaultValue={item.person}
                onBlur={(e) => {
                  const updated = [...plan.attire];
                  updated[i] = { ...updated[i], person: e.target.value };
                  savePlan({ ...plan, attire: updated });
                }}
                placeholder="Person (e.g. Partner 1, Honor Attendant)"
                className="w-full text-[15px] font-semibold text-plum border-0 bg-transparent"
              />
              <textarea
                defaultValue={item.description}
                onBlur={(e) => {
                  const updated = [...plan.attire];
                  updated[i] = { ...updated[i], description: e.target.value };
                  savePlan({ ...plan, attire: updated });
                }}
                placeholder="e.g. Ivory lace A-line gown, cathedral veil, pearl earrings, nude heels..."
                rows={2}
                className="w-full text-[13px] text-muted border-0 bg-transparent resize-none"
              />
            </div>
            <button
              onClick={() => savePlan({ ...plan, attire: plan.attire.filter((_, j) => j !== i) })}
              className="text-[10px] text-error hover:opacity-80 self-start"
            >
              x
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => savePlan({ ...plan, attire: [...plan.attire, { person: "", description: "", photoUrl: null }] })}
        className="btn-ghost btn-sm mt-3"
      >
        Add attire entry
      </button>
      <input
        ref={attirePhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async () => {
          const file = attirePhotoRef.current?.files?.[0];
          const idx = attirePhotoIndex.current;
          if (!file || idx === null) return;

          const formData = new FormData();
          formData.append("file", file);
          formData.append("entity_type", "task");
          formData.append("entity_id", "wedding-party-photo");

          try {
            const res = await fetch("/api/attachments", { method: "POST", body: formData });
            if (!res.ok) throw new Error();
            const { file_url } = await res.json();
            const updated = [...plan.attire];
            updated[idx] = { ...updated[idx], photoUrl: file_url };
            savePlan({ ...plan, attire: updated });
            toast.success("Photo saved");
          } catch {
            toast.error("Photo didn't upload. Try again.");
          }
          if (attirePhotoRef.current) attirePhotoRef.current.value = "";
        }}
      />
    </div>
  );
}
