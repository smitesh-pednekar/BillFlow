import "server-only";
import { and, eq, sql, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { toRows, num, str } from "@/db/rows";

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  address: string | null;
  phone: string | null;
  archivedAt: string | null;
  invoiceCount: number;
  billedCents: number;
  outstandingCents: number;
}

/**
 * Clients with their totals. One join, never a per-row query — the list must
 * not become N+1 as the client count grows.
 */
export async function listClients(
  userId: string,
  opts: { q?: string; includeArchived?: boolean } = {},
): Promise<ClientRow[]> {
  const q = opts.q?.trim();
  const rows = toRows(
    await db.execute(sql`
      SELECT c.id, c.name, c.email, c.company, c.address, c.phone,
             c.archived_at,
             COUNT(i.id)::int AS invoice_count,
             COALESCE(SUM(i.total_cents) FILTER (WHERE i.status <> 'draft' AND i.status <> 'void'), 0)::bigint
               AS billed_cents,
             COALESCE(SUM(i.total_cents - i.paid_cents) FILTER (WHERE i.status = 'sent'), 0)::bigint
               AS outstanding_cents
      FROM clients c
      LEFT JOIN invoices i ON i.client_id = c.id
      WHERE c.user_id = ${userId}
        ${opts.includeArchived ? sql`` : sql`AND c.archived_at IS NULL`}
        ${
          q
            ? sql`AND (c.name ILIKE ${`%${q}%`} OR c.company ILIKE ${`%${q}%`} OR c.email ILIKE ${`%${q}%`})`
            : sql``
        }
      GROUP BY c.id
      ORDER BY c.name ASC
    `),
  );

  return rows.map((r) => ({
    id: str(r.id),
    name: str(r.name),
    email: (r.email as string) ?? null,
    company: (r.company as string) ?? null,
    address: (r.address as string) ?? null,
    phone: (r.phone as string) ?? null,
    archivedAt: r.archived_at ? String(r.archived_at) : null,
    invoiceCount: num(r.invoice_count),
    billedCents: num(r.billed_cents),
    outstandingCents: num(r.outstanding_cents),
  }));
}

/**
 * Tenancy: the user id is always in the WHERE clause, never compared in JS
 * after the fact. Returns null so callers can 404 rather than 403 — we do not
 * confirm that someone else's record exists.
 */
export async function findClient(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Selectable clients for the invoice editor picker. */
export async function clientOptions(userId: string) {
  return db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      email: clients.email,
    })
    .from(clients)
    .where(and(eq(clients.userId, userId), isNull(clients.archivedAt)))
    .orderBy(clients.name);
}

export async function countClientInvoices(clientId: string, userId: string) {
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.clientId, clientId), eq(invoices.userId, userId)));
  return Number(row?.n ?? 0);
}
