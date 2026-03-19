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
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
          <p className="text-sm text-gray-500">
            No email template available for this category.
          </p>
          <button onClick={onClose} className="mt-4 text-sm text-rose-600">
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {showFollowUp ? "Follow-Up" : category} Email Template
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Subject
            </label>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-gray-900 flex-1">{active.subject}</p>
              <button
                onClick={() => copyToClipboard(active.subject)}
                className="text-xs text-rose-600 hover:text-rose-500 flex-shrink-0"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Body
            </label>
            <pre className="mt-1 whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-3 font-sans">
              {active.body}
            </pre>
            <button
              onClick={() => copyToClipboard(active.body)}
              className="mt-2 text-xs text-rose-600 hover:text-rose-500"
            >
              Copy body
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            {!showFollowUp && followUp && (
              <button
                onClick={() => setShowFollowUp(true)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Show follow-up template
              </button>
            )}
            {showFollowUp && template && (
              <button
                onClick={() => setShowFollowUp(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
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
