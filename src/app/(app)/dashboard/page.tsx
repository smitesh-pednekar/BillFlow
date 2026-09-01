import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import {
  getDashboardStats,
  getIncomeByMonth,
  getRecentInvoices,
} from "@/db/queries/dashboard";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { EmptyState } from "@/components/states";
import { IncomeChart } from "@/components/charts/IncomeChart";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — BillFlow" };
// Reads cookies, so never serve a stale cached dashboard.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const [stats, income, recent] = await Promise.all([
    getDashboardStats(user.id),
    getIncomeByMonth(user.id),
    getRecentInvoices(user.id),
  ]);

  const currency = user.currency ?? "USD";
  const hasAny =
    recent.length > 0 || stats.draftCount > 0 || stats.paidCents > 0;

  // Every stat links somewhere. Dead-end numbers are a smell.
  const cards = [
    {
      label: "Total earned",
      sub: "Paid this year",
      value: formatMoney(stats.paidCents, currency),
      href: "/invoices?status=paid",
      tone: "text-pine-700",
    },
    {
      label: "Outstanding",
      sub: "Sent, not yet due",
      value: formatMoney(stats.outstandingCents, currency),
      href: "/invoices?status=sent",
      tone: "text-ink",
    },
    {
      label: "Overdue",
      sub:
        stats.overdueCount === 1
          ? "1 invoice past due"
          : `${stats.overdueCount} invoices past due`,
      value: formatMoney(stats.overdueCents, currency),
      href: "/invoices?status=overdue",
      tone: stats.overdueCents > 0 ? "text-rust" : "text-ink",
    },
    {
      label: "Drafts",
      sub: "Not sent yet",
      value: String(stats.draftCount),
      href: "/invoices?status=draft",
      tone: "text-ink",
    },
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {user.businessName || user.name}
          </h1>
          <p className="mt-0.5 text-sm text-ink-2">
            Here is where your money stands today.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex h-11 items-center rounded-[6px] bg-pine-700 px-4 text-sm font-medium text-white transition-colors hover:bg-pine-900"
        >
          New invoice
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-[10px] border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(23_26_23_/_0.06)] transition-colors hover:border-ink-3"
          >
            <p className="text-[0.8125rem] font-medium text-ink-2">{c.label}</p>
            <p className={`tnum mt-2 text-xl font-semibold ${c.tone}`}>
              {c.value}
            </p>
            <p className="mt-1 text-[0.75rem] text-ink-3">{c.sub}</p>
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-[10px] border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_26_23_/_0.06)]">
        <h2 className="text-sm font-medium text-ink">Income over time</h2>
        <p className="text-[0.8125rem] text-ink-3">
          Paid invoices, last 12 months
        </p>
        <div className="mt-4">
          <IncomeChart data={income} currency={currency} />
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgb(23_26_23_/_0.06)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-medium text-ink">Recent invoices</h2>
          <Link
            href="/invoices"
            className="text-[0.8125rem] font-medium text-pine-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title={hasAny ? "Nothing here yet" : "No invoices yet"}
            body="Create your first one and send it in about a minute."
            action={{ label: "New invoice", href: "/invoices/new" }}
          />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-canvas"
                >
                  <span className="tnum text-[0.8125rem] text-ink-2">
                    {inv.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {inv.clientName}
                  </span>
                  <span className="tnum text-sm font-medium text-ink">
                    {formatMoney(inv.totalCents, inv.currency)}
                  </span>
                  <StatusBadge status={inv.displayStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
