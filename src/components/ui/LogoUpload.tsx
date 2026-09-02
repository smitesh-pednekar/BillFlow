"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export function LogoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Could not upload that image.", "error");
        return;
      }
      onChange(data.url);
      toast("Logo uploaded");
    } catch {
      toast("Could not reach the server.", "error");
    } finally {
      setBusy(false);
    }
  }

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-[6px] border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Your logo"
            className="h-10 w-auto max-w-[140px] object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto inline-flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[0.8125rem] text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
          >
            <X className="size-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-[6px] border border-dashed p-4 text-center transition-colors",
            dragging ? "border-pine-500 bg-pine-50" : "border-line bg-surface",
          )}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm font-medium text-pine-700 disabled:opacity-60"
          >
            <Upload className="size-4" aria-hidden="true" />
            {busy ? "Uploading…" : "Upload a logo"}
          </button>
          <p className="mt-1 text-[0.75rem] text-ink-3">
            or drop it here — PNG, JPG, WebP or SVG, up to 2 MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
}
