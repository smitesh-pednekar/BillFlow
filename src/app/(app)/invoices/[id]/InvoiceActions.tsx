"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Link2,
  Check,
  Pencil,
  Ban,
  Printer,
  RotateCcw,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { InvoiceStatus } from "@/lib/invoice";

export function InvoiceActions({
  id,
  status,
  publicUrl,
  clientEmail,
}: {
  id: string;
  status: InvoiceStatus;
  publicUrl: string;
  clientEmail: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = React.useState(false);

  async function post(path: string, body?: unknown, label?: string) {
    setBusy(label ?? path);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "That did not work.", "error");
        return null;
      }
      router.refresh();
      return data;
    } catch {
      toast("Could not reach the server.", "error");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    const data = await post(`/api/invoices/${id}/send`, {}, "send");
    if (!data) return;

    if (data.emailed) {
      toast(`Invoice sent to ${data.to}`);
      return;
    }

    // The invoice is sent either way; only the email leg failed. Say which
    // reason applies rather than always blaming configuration -- a provider
    // that rejected the recipient is a different problem to a missing key.
    if (!data.to) {
      toast("Marked as sent. This client has no email, so copy the link.");
    } else if (/not configured/i.test(data.emailError ?? "")) {
      toast("Marked as sent. Email is not configured, so share the link.");
    } else {
      toast(
        `Marked as sent, but the email to ${data.to} did not go through. Share the link instead.`,
        "error",
      );
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast("Link copied");
    } catch {
      toast("Could not copy. Select the link and copy it manually.", "error");
    }
  }

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        {status !== "paid" && status !== "void" && (
          <Button onClick={send} loading={busy === "send"}>
            <Send className="size-4" aria-hidden="true" />
            {status === "draft" ? "Send invoice" : "Resend"}
          </Button>
        )}

        {status !== "paid" && status !== "void" && (
          <Button
            variant="secondary"
            onClick={() =>
              post(`/api/invoices/${id}/status`, { status: "paid" }, "paid").then(
                (d) => d && toast("Marked as paid"),
              )
            }
            loading={busy === "paid"}
          >
            <Check className="size-4" aria-hidden="true" />
            Mark as paid
          </Button>
        )}

        <Button variant="secondary" onClick={copyLink}>
          <Link2 className="size-4" aria-hidden="true" />
          Copy link
        </Button>

        <Link
          href={`/invoices/${id}/edit`}
          className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-sunken"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </Link>

        <a
          href={`/api/invoices/${id}/pdf`}
          className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-sunken"
        >
          <Download className="size-4" aria-hidden="true" />
          Download PDF
        </a>

        <Button variant="ghost" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Print
        </Button>

        {status === "void" ? (
          <Button
            variant="ghost"
            onClick={() =>
              post(
                `/api/invoices/${id}/status`,
                { status: "draft" },
                "restore",
              ).then((d) => d && toast("Restored to draft"))
            }
            loading={busy === "restore"}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Restore
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmVoid(true)}>
            <Ban className="size-4" aria-hidden="true" />
            Void
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmVoid}
        onCancel={() => setConfirmVoid(false)}
        onConfirm={async () => {
          setConfirmVoid(false);
          const d = await post(
            `/api/invoices/${id}/status`,
            { status: "void" },
            "void",
          );
          if (d) toast("Invoice voided");
        }}
        destructive
        title="Void this invoice?"
        confirmLabel="Void invoice"
        body="It stays in your records for the audit trail but no longer counts toward what you are owed. You can restore it later."
      />
    </>
  );
}
