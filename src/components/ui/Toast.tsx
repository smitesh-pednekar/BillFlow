"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "success" | "error" };

const ToastCtx = React.createContext<{
  toast: (message: string, tone?: Toast["tone"]) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        tone === "error" ? 6000 : 4000,
      );
    },
    [],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        className="no-print pointer-events-none fixed bottom-20 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-[10px] px-4 py-2.5 text-sm shadow-[0_12px_32px_rgb(23_26_23_/_0.12)]",
              "motion-safe:animate-[toastIn_180ms_ease-out]",
              t.tone === "error"
                ? "bg-rust text-white"
                : "bg-pine-900 text-white",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(6px); opacity: 0 }
          to   { transform: translateY(0);   opacity: 1 }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}
