import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/auth";
import { invoiceSchema } from "@/lib/validators";
import {
  findInvoice,
  updateInvoice,
  deleteInvoice,
} from "@/db/queries/invoices";
import { findClient } from "@/db/queries/clients";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const row = await findInvoice(id, userId);
    if (!row) return fail("That invoice does not exist.", 404);
    return ok(row);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = invoiceSchema.parse(await req.json());

    if (!(await findClient(input.clientId, userId))) {
      return fail("That client does not exist.", 404);
    }

    const row = await updateInvoice(id, { userId, input });
    if (!row) return fail("That invoice does not exist.", 404);
    return ok(row);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const row = await deleteInvoice(id, userId);
    if (!row) return fail("That invoice does not exist.", 404);
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
