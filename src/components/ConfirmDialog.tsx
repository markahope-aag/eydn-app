"use client";

import { useRef } from "react";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Delete",
  destructive = true,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button ref={cancelRef} onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={
              destructive
                ? "rounded-[10px] bg-error text-white px-4 py-2 text-[15px] font-semibold hover:opacity-90 transition"
                : "btn-primary"
            }
          >
            {confirmLabel}
          </button>
        </div>
      }
    />
  );
}
