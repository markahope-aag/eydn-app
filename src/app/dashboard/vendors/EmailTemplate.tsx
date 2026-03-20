"use client";

import { useState } from "react";
import { toast } from "sonner";
import { VENDOR_EMAIL_TEMPLATES } from "@/lib/vendors/email-templates";

type Props = {
  category: string;
  onClose: () => void;
};

export function EmailTemplate({ category, onClose }: Props) {
  const template = VENDOR_EMAIL_TEMPLATES.find((t) => t.category === category);
  const followUp = VENDOR_EMAIL_TEMPLATES.find((t) => t.category === "Follow-Up");
  const [showFollowUp, setShowFollowUp] = useState(false);

  const active = showFollowUp ? followUp : template;

  if (!active) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-[16px] shadow-xl w-full max-w-lg mx-4 p-6">
          <p className="text-[15px] text-muted">
            No email template available for this category.
          </p>
          <button onClick={onClose} className="mt-4 text-[15px] text-violet">
            Close
          </button>
        </div>
      </div>
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[16px] shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-plum">
              {showFollowUp ? "Follow-Up" : category} Email Template
            </h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-plum text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="mt-4">
            <label className="text-[12px] font-semibold text-muted uppercase">
              Subject
            </label>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[15px] text-plum flex-1">{active.subject}</p>
              <button
                onClick={() => copyToClipboard(active.subject)}
                className="text-[12px] text-violet hover:text-soft-violet flex-shrink-0"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-[12px] font-semibold text-muted uppercase">
              Body
            </label>
            <pre className="mt-1 whitespace-pre-wrap text-[15px] text-muted bg-lavender rounded-[12px] p-3 font-sans">
              {active.body}
            </pre>
            <button
              onClick={() => copyToClipboard(active.body)}
              className="mt-2 text-[12px] text-violet hover:text-soft-violet"
            >
              Copy body
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            {!showFollowUp && followUp && (
              <button
                onClick={() => setShowFollowUp(true)}
                className="text-[15px] text-muted hover:text-plum"
              >
                Show follow-up template
              </button>
            )}
            {showFollowUp && template && (
              <button
                onClick={() => setShowFollowUp(false)}
                className="text-[15px] text-muted hover:text-plum"
              >
                Show initial template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
