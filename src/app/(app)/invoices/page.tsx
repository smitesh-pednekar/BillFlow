import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listInvoices } from "@/db/queries/invoices";
import { clientOptions } from "@/db/queries/clients";
import { listQuerySchema } from "@/lib/validators";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { EmptyState } from "@/components/states";
import { InvoiceFilters, SortableHeader } from "./InvoiceFilters";

export const metadata: Metadata = { title: "Invoices — BillFlow" };
export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = (await getCurrentUser())!;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;

  // Bad query values fall back to defaults rather than throwing a 500.
  const parsed = listQuerySchema.safeParse({
    q: one(sp.q),
    status: one(sp.status),
    client: one(sp.client),
    sort: one(sp.sort),
    dir: one(sp.dir),
    page: one(sp.page),
  });
  const query = parsed.success
    ? parsed.data
    : listQuerySchema.parse({});

  const [result, clients] = await Promise.all([
    listInvoices(user.id, query),
    clientOptions(user.id),
  ]);

  const hasFilters = !!(query.q || query.status || query.client);

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Invoices
          </h1>
          <p className="mt-0.5 text-sm text-ink-2">
            {result.total === 0
              ? "Everything you have billed."
              : `${result.total} invoice${result.total === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex h-11 items-center rounded-[6px] bg-pine-700 px-4 text-sm font-medium text-white transition-colors hover:bg-pine-900"
        >
          New invoice
        </Link>
      </header>

      <div className="mt-6">
        <Suspense fallback={null}>
          <InvoiceFilters
            clients={clients.map((c) => ({ id: c.id, name: c.name }))}
            statusCounts={result.statusCounts}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgb(23_26_23_/_0.06)]">
        {result.rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No invoices match this filter"
              body="Try a different status, client, or search term."
              action={{ label: "Clear filters", href: "/invoices" }}
            />
          ) : (
            <EmptyState
              icon={<FileText className="size-5" />}
              title="No invoices yet"
              body="Create your first one and send it in about a minute."
              action={{ label: "New invoice", href: "/invoices/new" }}
            />
          )
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full sm:table">
              <thead>
                <tr className="border-b border-line bg-sunken">
                  <SortableHeader label="Number" sortKey="number" />
                  <SortableHeader label="Client" sortKey="client" />
                  <SortableHeader label="Issued" sortKey="date" />
                  <SortableHeader label="Due" sortKey="due" />
                  <SortableHeader label="Amount" sortKey="amount" align="right" />
                  <th className="px-4 py-2.5 text-right text-[0.8125rem] font-medium text-ink-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.rows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-canvas">
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="tnum text-sm font-medium text-ink hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {inv.clientName}
                      {inv.clientCompany && (
                        <span className="block text-[0.8125rem] text-ink-3">
                          {inv.clientCompany}
                        </span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-sm text-ink-2">
                      {fmtDate(inv.issueDate)}
                    </td>
                    <td className="tnum px-4 py-3 text-sm">
                      <span
                        className={
                          inv.displayStatus === "overdue"
                            ? "font-medium text-rust"
                            : "text-ink-2"
                        }
                      >
                        {fmtDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="tnum px-4 py-3 text-right text-sm font-medium text-ink">
                      {formatMoney(inv.totalCents, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={inv.displayStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-line sm:hidden">
              {result.rows.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="block px-4 py-3.5 hover:bg-canvas"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="tnum text-[0.8125rem] text-ink-2">
                          {inv.number}
                        </p>
                        <p className="truncate text-sm font-medium text-ink">
                          {inv.clientName}
                        </p>
                      </div>
                      <StatusBadge status={inv.displayStatus} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span
                        className={`tnum text-[0.8125rem] ${
                          inv.displayStatus === "overdue"
                            ? "font-medium text-rust"
                            : "text-ink-3"
                        }`}
                      >
                        Due {fmtDate(inv.dueDate)}
                      </span>
                      <span className="tnum text-sm font-medium text-ink">
                        {formatMoney(inv.totalCents, inv.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      </Suspense>

      {result.pageCount > 1 && (
        <nav
          className="mt-4 flex items-center justify-between"
          aria-label="Pagination"
        >
          <PageLink
            sp={sp}
            page={query.page - 1}
            disabled={query.page <= 1}
            label="Previous"
          />
          <span className="text-[0.8125rem] text-ink-2">
            Page {query.page} of {result.pageCount}
          </span>
          <PageLink
            sp={sp}
            page={query.page + 1}
            disabled={query.page >= result.pageCount}
            label="Next"
          />
        </nav>
      )}
    </div>
  );
}

function PageLink({
  sp,
  page,
  disabled,
  label,
}: {
  sp: Record<string, string | string[] | undefined>;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-[6px] px-3 py-2 text-[0.8125rem] text-ink-3">
        {label}
      </span>
    );
  }
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val && k !== "page") next.set(k, val);
  }
  next.set("page", String(page));
  return (
    <Link
      href={`/invoices?${next.toString()}`}
      className="rounded-[6px] border border-line px-3 py-2 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-sunken"
    >
      {label}
    </Link>
  );
}
