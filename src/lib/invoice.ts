import { sql } from "drizzle-orm";

export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const DISPLAY_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
] as const;
export type DisplayStatus = (typeof DISPLAY_STATUSES)[number];

/**
 * "overdue" is never stored. It is derived from the due date, so an invoice
 * becomes overdue at midnight with no cron job involved.
 *
 * This mirrors the `display_status` expression in the `invoice_view` SQL view
 * exactly. If you change one, change the other.
 */
export function displayStatus(invoice: {
  status: InvoiceStatus;
  dueDate: string;
}): DisplayStatus {
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "draft") return "draft";
  if (invoice.status === "void") return "void";
  return invoice.dueDate < todayISO() ? "overdue" : "sent";
}

/** Local calendar date as YYYY-MM-DD. Dates are dates, never timestamps. */
export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysUntil(iso: string, from = todayISO()): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

/**
 * The single source of truth for derived status in SQL. Selected by the
 * list, dashboard, detail, and public pages so they cannot drift apart.
 */
export const displayStatusSql = sql<DisplayStatus>`
  CASE
    WHEN invoices.status = 'paid'  THEN 'paid'
    WHEN invoices.status = 'draft' THEN 'draft'
    WHEN invoices.status = 'void'  THEN 'void'
    WHEN invoices.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END
`;

export function formatInvoiceNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** An invoice is locked once the client has seen it. Not a wall — a guardrail. */
export function isLocked(status: InvoiceStatus): boolean {
  return status !== "draft";
}
