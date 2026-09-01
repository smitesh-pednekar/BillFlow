import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { toRows, num, str } from "@/db/rows";
import type { DisplayStatus } from "@/lib/invoice";

export interface DashboardStats {
  paidCents: number;
  outstandingCents: number;
  overdueCents: number;
  overdueCount: number;
  draftCount: number;
}

/** One pass over the view; no N+1, no per-card round trip. */
export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  const [r = {}] = toRows(
    await db.execute(sql`
      SELECT
        COALESCE(SUM(total_cents) FILTER (
          WHERE display_status = 'paid'
            AND paid_at >= date_trunc('year', CURRENT_DATE)
        ), 0)::bigint AS paid_cents,
        COALESCE(SUM(balance_cents) FILTER (WHERE display_status = 'sent'), 0)::bigint
          AS outstanding_cents,
        COALESCE(SUM(balance_cents) FILTER (WHERE display_status = 'overdue'), 0)::bigint
          AS overdue_cents,
        COUNT(*) FILTER (WHERE display_status = 'overdue')::int AS overdue_count,
        COUNT(*) FILTER (WHERE display_status = 'draft')::int AS draft_count
      FROM invoice_view
      WHERE user_id = ${userId}
    `),
  );

  return {
    paidCents: num(r.paid_cents),
    outstandingCents: num(r.outstanding_cents),
    overdueCents: num(r.overdue_cents),
    overdueCount: num(r.overdue_count),
    draftCount: num(r.draft_count),
  };
}

export interface MonthPoint {
  month: string;
  cents: number;
}

/** Income over the last 12 months, zero-filled so the chart has no gaps. */
export async function getIncomeByMonth(userId: string): Promise<MonthPoint[]> {
  const rows = toRows(
    await db.execute(sql`
      SELECT to_char(m, 'YYYY-MM') AS month,
             COALESCE(SUM(i.total_cents), 0)::bigint AS cents
      FROM generate_series(
             date_trunc('month', CURRENT_DATE) - interval '11 months',
             date_trunc('month', CURRENT_DATE),
             interval '1 month'
           ) m
      LEFT JOIN invoices i
        ON date_trunc('month', i.paid_at) = m
       AND i.user_id = ${userId}
       AND i.status = 'paid'
      GROUP BY m
      ORDER BY m
    `),
  );

  return rows.map((r) => ({ month: str(r.month), cents: num(r.cents) }));
}

export interface RecentInvoice {
  id: string;
  number: string;
  clientName: string;
  totalCents: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  displayStatus: DisplayStatus;
}

export async function getRecentInvoices(
  userId: string,
  limit = 5,
): Promise<RecentInvoice[]> {
  const rows = toRows(
    await db.execute(sql`
      SELECT id, number, client_name, total_cents, currency,
             issue_date::text AS issue_date, due_date::text AS due_date,
             display_status
      FROM invoice_view
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `),
  );

  return rows.map((r) => ({
    id: str(r.id),
    number: str(r.number),
    clientName: str(r.client_name),
    totalCents: num(r.total_cents),
    currency: str(r.currency),
    issueDate: str(r.issue_date),
    dueDate: str(r.due_date),
    displayStatus: r.display_status as DisplayStatus,
  }));
}
