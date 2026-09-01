import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { clientSchema } from "@/lib/validators";
import { requireUserId } from "@/lib/auth";
import { findClient, countClientInvoices } from "@/db/queries/clients";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const row = await findClient(id, userId);
    if (!row) return fail("That client does not exist.", 404);
    return ok(row);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = clientSchema.parse(await req.json());

    const [row] = await db
      .update(clients)
      .set({
        name: input.name,
        email: input.email || null,
        company: input.company || null,
        address: input.address || null,
        phone: input.phone || null,
      })
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();

    if (!row) return fail("That client does not exist.", 404);
    return ok(row);
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Deleting a client with invoices would orphan billing history and violate the
 * FK, so that case archives instead. Only a client with no invoices is really
 * deleted.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await findClient(id, userId);
    if (!existing) return fail("That client does not exist.", 404);

    const invoiceCount = await countClientInvoices(id, userId);

    if (invoiceCount > 0) {
      await db
        .update(clients)
        .set({ archivedAt: new Date() })
        .where(and(eq(clients.id, id), eq(clients.userId, userId)));
      return ok({ archived: true, invoiceCount });
    }

    await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return ok({ archived: false, invoiceCount: 0 });
  } catch (e) {
    return handleError(e);
  }
}
