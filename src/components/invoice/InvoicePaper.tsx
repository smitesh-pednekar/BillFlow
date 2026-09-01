import { formatMoney } from "@/lib/money";
import { STATUS_LABEL, type DisplayStatus } from "@/lib/invoice";
import { cn } from "@/lib/utils";

export interface PaperParty {
  name: string;
  email?: string | null;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

export interface PaperItem {
  description: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
}

export interface PaperInvoice {
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: DisplayStatus;
  items: PaperItem[];
  subtotalCents: number;
  discountCents: number;
  discountKind: "none" | "percent" | "fixed";
  discountValue: number;
  taxBps: number;
  taxCents: number;
  totalCents: number;
  notes?: string | null;
  terms?: string | null;
  footer?: string | null;
  billTo: PaperParty;
  billFrom: PaperParty;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Party({ label, party }: { label: string; party: PaperParty }) {
  return (
    <div>
      <p className="text-[0.75rem] font-medium text-ink-3">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-ink">{party.name}</p>
      {party.company && (
        <p className="text-[0.8125rem] text-ink-2">{party.company}</p>
      )}
      {party.address && (
        <p className="mt-0.5 whitespace-pre-line text-[0.8125rem] text-ink-2">
          {party.address}
        </p>
      )}
      {party.email && (
        <p className="mt-0.5 text-[0.8125rem] text-ink-2">{party.email}</p>
      )}
      {party.phone && (
        <p className="text-[0.8125rem] text-ink-2">{party.phone}</p>
      )}
    </div>
  );
}

/**
 * The one rendering of an invoice. The detail page, the public page and the
 * print stylesheet all use this component, so they cannot drift apart.
 */
export function InvoicePaper({
  invoice,
  className,
}: {
  invoice: PaperInvoice;
  className?: string;
}) {
  const {
    billFrom,
    billTo,
    items,
    currency,
    status,
    discountKind,
    discountValue,
  } = invoice;

  const discountLabel =
    discountKind === "percent"
      ? `Discount (${discountValue / 100}%)`
      : "Discount";

  return (
    <article
      className={cn(
        // Paper, not another card: square corners, hairline border, one shadow.
        "bg-surface border border-line shadow-[0_12px_32px_rgb(23_26_23_/_0.12)]",
        "px-6 py-8 sm:px-10 sm:py-10",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          {billFrom.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={billFrom.logoUrl}
              alt={`${billFrom.name} logo`}
              className="mb-3 h-10 w-auto max-w-[180px] object-contain"
            />
          ) : null}
          <p className="text-sm font-medium text-ink">{billFrom.name}</p>
          {billFrom.address && (
            <p className="mt-0.5 whitespace-pre-line text-[0.8125rem] text-ink-2">
              {billFrom.address}
            </p>
          )}
          {billFrom.email && (
            <p className="text-[0.8125rem] text-ink-2">{billFrom.email}</p>
          )}
        </div>

        <div className="text-right">
          <h1 className="font-display text-xl font-semibold text-ink">Invoice</h1>
          <p className="tnum mt-0.5 text-sm text-ink-2">{invoice.number}</p>
          <p
            className={cn(
              "mt-2 inline-block rounded-full px-2.5 py-1 text-[0.75rem] font-medium",
              status === "paid" && "bg-pine-100 text-pine-700",
              status === "overdue" && "bg-rust-50 text-rust",
              status === "void" && "bg-sunken text-ink-3",
              status === "draft" && "bg-slate-50 text-slate",
              status === "sent" && "bg-indigo-50 text-indigo",
            )}
          >
            {STATUS_LABEL[status]}
          </p>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Party label="Bill to" party={billTo} />
        <div>
          <p className="text-[0.75rem] font-medium text-ink-3">Issued</p>
          <p className="tnum mt-1.5 text-sm text-ink">
            {fmtDate(invoice.issueDate)}
          </p>
        </div>
        <div>
          <p className="text-[0.75rem] font-medium text-ink-3">Due</p>
          <p
            className={cn(
              "tnum mt-1.5 text-sm",
              status === "overdue" ? "font-medium text-rust" : "text-ink",
            )}
          >
            {fmtDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-2 text-left text-[0.75rem] font-medium text-ink-3">
                Description
              </th>
              <th className="pb-2 text-right text-[0.75rem] font-medium text-ink-3">
                Qty
              </th>
              <th className="pb-2 text-right text-[0.75rem] font-medium text-ink-3">
                Rate
              </th>
              <th className="pb-2 text-right text-[0.75rem] font-medium text-ink-3">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-ink-3">
                  No line items yet.
                </td>
              </tr>
            ) : (
              items.map((it, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-3 pr-4 align-top text-sm text-ink">
                    <span className="whitespace-pre-line">{it.description}</span>
                  </td>
                  <td className="tnum py-3 text-right align-top text-sm text-ink-2">
                    {Number.isInteger(it.quantity)
                      ? it.quantity
                      : it.quantity.toFixed(2)}
                  </td>
                  <td className="tnum py-3 text-right align-top text-sm text-ink-2">
                    {formatMoney(it.unitCents, currency)}
                  </td>
                  <td className="tnum py-3 text-right align-top text-sm text-ink">
                    {formatMoney(it.amountCents, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-[280px] space-y-2">
          <div className="flex justify-between text-sm">
            <dt className="text-ink-2">Subtotal</dt>
            <dd className="tnum text-ink">
              {formatMoney(invoice.subtotalCents, currency)}
            </dd>
          </div>

          {invoice.discountCents > 0 && (
            <div className="flex justify-between text-sm">
              <dt className="text-ink-2">{discountLabel}</dt>
              <dd className="tnum text-ink">
                −{formatMoney(invoice.discountCents, currency)}
              </dd>
            </div>
          )}

          {invoice.taxCents > 0 && (
            <div className="flex justify-between text-sm">
              <dt className="text-ink-2">Tax ({invoice.taxBps / 100}%)</dt>
              <dd className="tnum text-ink">
                {formatMoney(invoice.taxCents, currency)}
              </dd>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="text-sm font-medium text-ink">Total</dt>
            {/* The largest thing on the page it appears on. */}
            <dd className="tnum font-display text-2xl font-semibold text-ink">
              {formatMoney(invoice.totalCents, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {(invoice.notes || invoice.terms || invoice.footer) && (
        <footer className="mt-8 space-y-4 border-t border-line pt-6">
          {invoice.notes && (
            <div>
              <p className="text-[0.75rem] font-medium text-ink-3">Notes</p>
              <p className="mt-1 whitespace-pre-line text-[0.8125rem] text-ink-2">
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="text-[0.75rem] font-medium text-ink-3">Terms</p>
              <p className="mt-1 whitespace-pre-line text-[0.8125rem] text-ink-2">
                {invoice.terms}
              </p>
            </div>
          )}
          {invoice.footer && (
            <p className="text-[0.75rem] text-ink-3">{invoice.footer}</p>
          )}
        </footer>
      )}
    </article>
  );
}
