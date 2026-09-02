import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceEvents } from "@/db/schema";
import { findInvoiceByToken } from "@/db/queries/invoices";
import { toPaperInvoice } from "@/lib/toPaper";
import { displayStatus } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";
import { InvoicePaper } from "@/components/invoice/InvoicePaper";
import { PayButton } from "./PayButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice — BillFlow",
  // A public link should not be indexed.
  robots: { index: false, follow: false },
};

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const invoice = await findInvoiceByToken(token);

  // A wrong or revoked token is simply not found — never a hint that it existed.
  if (!invoice || invoice.status === "void") notFound();

  const status = displayStatus({
    status: invoice.status,
    dueDate: invoice.dueDate,
  });

  /**
   * Record the first view. The conditional UPDATE means a refresh does not log
   * a second event, and it costs one statement rather than a read plus write.
   */
  const [firstView] = await db
    .update(invoices)
    .set({ firstViewedAt: new Date() })
    .where(and(eq(invoices.id, invoice.id), isNull(invoices.firstViewedAt)))
    .returning({ id: invoices.id });

  if (firstView) {
    await db
      .insert(invoiceEvents)
      .values({ invoiceId: invoice.id, kind: "viewed" });
  }

  const paper = toPaperInvoice(invoice, invoice.user);
  const { billFrom } = paper;

  const isPaid = status === "paid";
  const justPaid = sp.paid === "1";

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-[760px]">
        {justPaid && !isPaid && (
          <div className="no-print mb-4 rounded-[10px] bg-pine-100 px-4 py-3 text-sm text-pine-700">
            Thanks — your payment is processing. This page updates once it
            settles.
          </div>
        )}

        <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.8125rem] text-ink-3">Invoice from</p>
            <p className="text-sm font-medium text-ink">{billFrom.name}</p>
          </div>

          {isPaid ? (
            <div className="rounded-[10px] bg-pine-100 px-4 py-2.5 text-center">
              <p className="text-[0.8125rem] font-medium text-pine-700">
                Paid
                {invoice.paidAt
                  ? ` on ${new Date(invoice.paidAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                    })}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="hidden sm:block">
              <PayButton
                token={token}
                amountLabel={formatMoney(invoice.totalCents, invoice.currency)}
              />
            </div>
          )}
        </header>

        <InvoicePaper invoice={paper} />

        <footer className="no-print mt-6 pb-24 text-center sm:pb-6">
          <Link
            href="/"
            className="text-[0.75rem] text-ink-3 transition-colors hover:text-ink-2"
          >
            Sent with BillFlow
          </Link>
        </footer>
      </div>

      {/* Sticky pay bar on mobile. */}
      {!isPaid && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 sm:hidden">
          <div>
            <p className="text-[0.75rem] text-ink-3">Amount due</p>
            <p className="tnum text-lg font-semibold text-ink">
              {formatMoney(invoice.totalCents, invoice.currency)}
            </p>
          </div>
          <PayButton
            token={token}
            amountLabel={formatMoney(invoice.totalCents, invoice.currency)}
            compact
          />
        </div>
      )}
    </div>
  );
}
