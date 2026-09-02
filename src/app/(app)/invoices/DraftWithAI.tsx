"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/money";

export interface DraftedItem {
  description: string;
  quantity: number;
  unitCents: number;
}

const SUGGESTIONS = [
  "3 days of brand design at 400/day, plus 5 hours of revisions at 40/hr, 20% VAT",
  "Landing page redesign — 3 concepts at 680 each, and 24 hours of frontend at 95/hr",
  "Monthly retainer 4500, plus 2 extra workshops at 850",
];

export function DraftWithAI({
  currency,
  onApply,
}: {
  currency: string;
  onApply: (draft: {
    items: DraftedItem[];
    taxBps: number;
    notes: string | null;
  }) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState<{
    items: DraftedItem[];
    taxBps: number;
    notes: string | null;
    demo: boolean;
  } | null>(null);

  async function draft() {
    if (prompt.trim().length < 10) {
      toast("Describe the work in a sentence or two.", "error");
      return;
    }
    setBusy(true);
    setPreview(null);
    try {
      const res = await fetch("/api/ai/draft-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(body.error ?? "Could not draft those line items.", "error");
        return;
      }
      setPreview(body);
    } catch {
      toast("Could not reach the server.", "error");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!preview) return;
    onApply({
      items: preview.items,
      taxBps: preview.taxBps,
      notes: preview.notes,
    });
    setOpen(false);
    setPreview(null);
    setPrompt("");
    toast(
      `${preview.items.length} line item${preview.items.length === 1 ? "" : "s"} added — edit anything that is off`,
    );
  }

  const total =
    preview?.items.reduce((a, b) => a + Math.round(b.quantity * b.unitCents), 0) ??
    0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-[10px] border border-dashed border-pine-500 bg-pine-50 px-4 py-3 text-left transition-colors hover:bg-pine-100"
      >
        <Sparkles className="size-4 shrink-0 text-pine-700" aria-hidden="true" />
        <span>
          <span className="block text-sm font-medium text-pine-700">
            Describe the work instead
          </span>
          <span className="block text-[0.8125rem] text-ink-2">
            Write it in plain English and the line items fill themselves in.
          </span>
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-[10px] border border-pine-500 bg-pine-50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-pine-700">
          <Sparkles className="size-4" aria-hidden="true" />
          Describe the work
        </h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPreview(null);
          }}
          className="text-[0.8125rem] text-ink-2 hover:text-ink"
        >
          Close
        </button>
      </div>

      <label className="sr-only" htmlFor="ai-prompt">
        Describe the work in plain English
      </label>
      <Textarea
        id="ai-prompt"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="3 days of brand design at 400/day, plus 5 hours of revisions at 40/hr, 20% VAT"
        className="mt-3 bg-surface"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            draft();
          }
        }}
      />

      {!preview && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-left text-[0.75rem] text-ink-2 transition-colors hover:border-pine-500 hover:text-ink"
            >
              {s.length > 46 ? `${s.slice(0, 46)}…` : s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={draft} loading={busy}>
          {busy ? "Drafting…" : "Draft line items"}
        </Button>
        <span className="text-[0.75rem] text-ink-3">⌘↵ to draft</span>
      </div>

      {preview && (
        <div className="mt-4 rounded-[6px] border border-line bg-surface p-3">
          {preview.demo && (
            <p className="mb-2 rounded-[6px] bg-ochre-50 px-2.5 py-1.5 text-[0.75rem] text-ink">
              No AI key is configured on this deployment, so this is a worked
              example. The flow is otherwise identical.
            </p>
          )}

          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-1.5 text-left text-[0.75rem] font-medium text-ink-3">
                  Description
                </th>
                <th className="pb-1.5 text-right text-[0.75rem] font-medium text-ink-3">
                  Qty
                </th>
                <th className="pb-1.5 text-right text-[0.75rem] font-medium text-ink-3">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.items.map((it, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-[0.8125rem] text-ink">
                    {it.description}
                  </td>
                  <td className="tnum py-1.5 text-right text-[0.8125rem] text-ink-2">
                    {it.quantity}
                  </td>
                  <td className="tnum py-1.5 text-right text-[0.8125rem] text-ink-2">
                    {formatMoney(it.unitCents, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[0.75rem] text-ink-3">
              {preview.taxBps > 0 && `Tax ${preview.taxBps / 100}% · `}
              Subtotal
            </span>
            <span className="tnum text-sm font-medium text-ink">
              {formatMoney(total, currency)}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={apply}>
              Use these items
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setPreview(null)}
            >
              Try again
            </Button>
          </div>
          <p className="mt-2 text-[0.75rem] text-ink-3">
            These replace the current line items. Everything stays editable.
          </p>
        </div>
      )}
    </section>
  );
}
