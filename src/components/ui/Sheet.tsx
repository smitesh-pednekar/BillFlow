"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slide-over on desktop, full-height sheet on mobile. Used for add/edit so the
 * user never loses their place in the list.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the panel so the keyboard path works.
    panelRef.current?.querySelector<HTMLElement>(
      "input,textarea,select,button",
    )?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-full w-full flex-col bg-surface shadow-[0_12px_32px_rgb(23_26_23_/_0.12)]",
          "sm:max-w-[440px]",
          "motion-safe:animate-[slideIn_180ms_ease-out]",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-medium text-ink">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[0.8125rem] text-ink-2">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-[6px] p-2 text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="border-t border-line px-5 py-4">{footer}</footer>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(12px); opacity: 0 }
          to   { transform: translateX(0);    opacity: 1 }
        }
      `}</style>
    </div>
  );
}

/** Confirm dialog that names what it is about to do. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  destructive,
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/20"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[420px] rounded-[14px] bg-surface p-5 shadow-[0_12px_32px_rgb(23_26_23_/_0.12)]"
      >
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <div className="mt-1.5 text-sm text-ink-2">{body}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-[6px] border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "h-11 rounded-[6px] px-4 text-sm font-medium text-white transition-colors disabled:opacity-50",
              destructive ? "bg-rust hover:brightness-90" : "bg-pine-700 hover:bg-pine-900",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
