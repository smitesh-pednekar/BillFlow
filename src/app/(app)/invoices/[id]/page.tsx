import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { findInvoice } from "@/db/queries/invoices";
import { toPaperInvoice } from "@/lib/toPaper";
import { displayStatus } from "@/lib/invoice";
import { InvoicePaper } from "@/components/invoice/InvoicePaper";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { InvoiceActions } from "./InvoiceActions";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Invoice — BillFlow" };
  const invoice = await findInvoice(id, user.id);
  return { title: invoice ? `${invoice.number} — BillFlow` : "Invoice — BillFlow" };
}

const EVENT_LABEL: Record<string, string> = {
  created: "Created",
  sent: "Sent",
  viewed: "Viewed by client",
  paid: "Paid",
  reminded: "Reminder sent",
  voided: "Voided",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const invoice = await findInvoice(id, user.id);
  if (!invoice) notFound();

  const status = displayStatus({
    status: invoice.status,
    dueDate: invoice.dueDate,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/i/${invoice.publicToken}`;

  const paper = toPaperInvoice(invoice, user);
  const { billTo } = paper;

  const events = [...invoice.events].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <Link
        href="/invoices"
        className="no-print inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All invoices
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="tnum font-display text-2xl font-semibold text-ink">
              {invoice.number}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-sm text-ink-2">
            {billTo.name} · {formatMoney(invoice.totalCents, invoice.currency)}
          </p>
        </div>
        <InvoiceActions
          id={invoice.id}
          status={invoice.status}
          publicUrl={publicUrl}
          clientEmail={invoice.client.email}
        />
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_260px]">
        <InvoicePaper invoice={paper} />

        {/* Activity rail — the feature freelancers actually want. */}
        <aside className="no-print hidden xl:block">
          <div className="sticky top-8 rounded-[10px] border border-line bg-surface p-4">
            <h2 className="text-sm font-medium text-ink">Activity</h2>
            <ol className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2.5">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-pine-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] text-ink">
                      {EVENT_LABEL[e.kind] ?? e.kind}
                    </p>
                    <p className="text-[0.75rem] text-ink-3">
                      {new Date(e.createdAt).toLocaleString("en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[0.75rem] font-medium text-ink-3">
                Shareable link
              </p>
              <p className="mt-1 break-all text-[0.75rem] text-ink-2">
                {publicUrl}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
