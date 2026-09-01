import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { invoices, invoiceItems, invoiceEvents, users } from "@/db/schema";
import { toRows, num, str } from "@/db/rows";
import { computeTotals } from "@/lib/money";
import {
  formatInvoiceNumber,
  type DisplayStatus,
  type InvoiceStatus,
} from "@/lib/invoice";
import type { InvoiceInput, ListQuery } from "@/lib/validators";

const PAGE_SIZE = 20;

export interface InvoiceListRow {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  currency: string;
  displayStatus: DisplayStatus;
}

export interface InvoiceListResult {
  rows: InvoiceListRow[];
  total: number;
  page: number;
  pageCount: number;
  statusCounts: Record<DisplayStatus, number>;
}

/**
 * Filtering, sorting and pagination all happen in Postgres, so the URL is
 * shareable and the page never loads rows it will not show.
 */
export async function listInvoices(
  userId: string,
  query: ListQuery,
): Promise<InvoiceListResult> {
  const { q, status, client, sort, dir, page } = query;

  const filters = sql`user_id = ${userId}`;
  const search = q?.trim()
    ? sql` AND (number ILIKE ${`%${q}%`} OR client_name ILIKE ${`%${q}%`} OR client_company ILIKE ${`%${q}%`})`
    : sql``;
  const byStatus = status ? sql` AND display_status = ${status}` : sql``;
  const byClient = client ? sql` AND client_id = ${client}` : sql``;
  const where = sql`${filters}${search}${byStatus}${byClient}`;

  // Whitelisted: a raw column name is never interpolated from user input.
  const SORTS: Record<string, string> = {
    date: "issue_date",
    due: "due_date",
    amount: "total_cents",
    number: "number",
    client: "client_name",
  };
  const col = SORTS[sort] ?? "issue_date";
  const order = dir === "asc" ? sql`ASC` : sql`DESC`;
  const orderBy = sql`${sql.raw(col)} ${order}, id DESC`;

  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows, statusRows] = await Promise.all([
    db.execute(sql`
      SELECT id, number, client_id, client_name, client_company,
             issue_date::text AS issue_date, due_date::text AS due_date,
             total_cents, currency, display_status
      FROM invoice_view
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `),
    db.execute(sql`SELECT COUNT(*)::int AS n FROM invoice_view WHERE ${where}`),
    // Counts ignore the status filter so the chips always show every option.
    db.execute(sql`
      SELECT display_status, COUNT(*)::int AS n
      FROM invoice_view
      WHERE ${filters}${search}${byClient}
      GROUP BY display_status
    `),
  ]);

  const total = num(toRows(countRows)[0]?.n);
  const statusCounts = {
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    void: 0,
  } as Record<DisplayStatus, number>;
  for (const r of toRows(statusRows)) {
    statusCounts[r.display_status as DisplayStatus] = num(r.n);
  }

  return {
    rows: toRows(rows).map((r) => ({
      id: str(r.id),
      number: str(r.number),
      clientId: str(r.client_id),
      clientName: str(r.client_name),
      clientCompany: (r.client_company as string) ?? null,
      issueDate: str(r.issue_date),
      dueDate: str(r.due_date),
      totalCents: num(r.total_cents),
      currency: str(r.currency),
      displayStatus: r.display_status as DisplayStatus,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    statusCounts,
  };
}

/**
 * Tenancy is enforced in the WHERE clause, never by comparing in JS after a
 * lookup by id alone.
 */
export async function findInvoice(id: string, userId: string) {
  const row = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.userId, userId)),
    with: {
      items: true,
      client: true,
      events: true,
      payments: true,
    },
  });
  return row ?? null;
}

export async function findInvoiceByToken(token: string) {
  return (
    (await db.query.invoices.findFirst({
      where: eq(invoices.publicToken, token),
      with: { items: true, client: true, user: true },
    })) ?? null
  );
}

/** Sorted items — the editor and the paper must agree on order. */
export function sortItems<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

interface SaveArgs {
  userId: string;
  input: InvoiceInput;
  currency: string;
}

/**
 * The server recomputes every total from the line items and ignores whatever
 * the client sent. A browser is never the source of truth about money.
 */
function totalsFor(input: InvoiceInput) {
  return computeTotals({
    items: input.items.map((i) => ({
      quantity: i.quantity,
      unitCents: i.unitCents,
    })),
    discountKind: input.discountKind,
    discountValue: input.discountValue,
    taxBps: input.taxBps,
  });
}

export async function createInvoice({ userId, input, currency }: SaveArgs) {
  const totals = totalsFor(input);

  // UPDATE ... RETURNING takes a row lock, so two simultaneous creates cannot
  // collide on the same number. The unique index is the safety net.
  const numberRows = toRows(
    await db.execute(sql`
      UPDATE users SET next_invoice_no = next_invoice_no + 1
      WHERE id = ${userId}
      RETURNING invoice_prefix, next_invoice_no - 1 AS n
    `),
  );
  const seq = numberRows[0];
  const number = formatInvoiceNumber(str(seq?.invoice_prefix), num(seq?.n));

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId,
      clientId: input.clientId,
      number,
      status: "draft",
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency,
      notes: input.notes || null,
      terms: input.terms || null,
      subtotalCents: totals.subtotal,
      discountKind: input.discountKind,
      discountValue: input.discountValue,
      discountCents: totals.discount,
      taxBps: input.taxBps,
      taxCents: totals.tax,
      totalCents: totals.total,
      publicToken: nanoid(32),
    })
    .returning();

  if (input.items.length) {
    await db.insert(invoiceItems).values(
      input.items.map((it, idx) => ({
        invoiceId: invoice.id,
        position: idx,
        description: it.description,
        quantity: String(it.quantity),
        unitCents: it.unitCents,
        amountCents: totals.lines[idx],
      })),
    );
  }

  await db
    .insert(invoiceEvents)
    .values({ invoiceId: invoice.id, kind: "created" });

  return invoice;
}

export async function updateInvoice(
  id: string,
  { userId, input }: Omit<SaveArgs, "currency">,
) {
  const totals = totalsFor(input);

  const [invoice] = await db
    .update(invoices)
    .set({
      clientId: input.clientId,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      notes: input.notes || null,
      terms: input.terms || null,
      subtotalCents: totals.subtotal,
      discountKind: input.discountKind,
      discountValue: input.discountValue,
      discountCents: totals.discount,
      taxBps: input.taxBps,
      taxCents: totals.tax,
      totalCents: totals.total,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .returning();

  if (!invoice) return null;

  // Items are replaced wholesale: simpler than diffing and always consistent.
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  if (input.items.length) {
    await db.insert(invoiceItems).values(
      input.items.map((it, idx) => ({
        invoiceId: id,
        position: idx,
        description: it.description,
        quantity: String(it.quantity),
        unitCents: it.unitCents,
        amountCents: totals.lines[idx],
      })),
    );
  }

  return invoice;
}

export async function setInvoiceStatus(
  id: string,
  userId: string,
  status: InvoiceStatus,
) {
  const now = new Date();
  const patch: Partial<typeof invoices.$inferInsert> = {
    status,
    updatedAt: now,
  };

  if (status === "paid") patch.paidAt = now;
  if (status === "draft") {
    patch.paidAt = null;
    patch.sentAt = null;
  }

  const [row] = await db
    .update(invoices)
    .set(patch)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .returning();

  if (!row) return null;

  if (status === "paid") {
    await db
      .update(invoices)
      .set({ paidCents: row.totalCents })
      .where(eq(invoices.id, id));
  }

  await db.insert(invoiceEvents).values({
    invoiceId: id,
    kind: status === "void" ? "voided" : status,
  });

  return row;
}

export async function deleteInvoice(id: string, userId: string) {
  const [row] = await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .returning({ id: invoices.id });
  return row ?? null;
}

export async function logEvent(
  invoiceId: string,
  kind: string,
  meta?: unknown,
) {
  await db
    .insert(invoiceEvents)
    .values({ invoiceId, kind, meta: meta ?? null });
}

export { users };
