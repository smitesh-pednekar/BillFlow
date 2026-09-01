import { NextRequest } from "next/server";
import { requireUserId, getCurrentUser } from "@/lib/auth";
import { invoiceSchema, listQuerySchema } from "@/lib/validators";
import { listInvoices, createInvoice } from "@/db/queries/invoices";
import { findClient } from "@/db/queries/clients";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sp = req.nextUrl.searchParams;
    const query = listQuerySchema.parse({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      client: sp.get("client") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      dir: sp.get("dir") ?? undefined,
      page: sp.get("page") ?? undefined,
    });
    return ok(await listInvoices(userId, query));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("You need to be signed in.", 401);
    await requireUserId();

    const input = invoiceSchema.parse(await req.json());

    // The client must belong to this user; otherwise the FK would let someone
    // bill against a stranger's record.
    if (!(await findClient(input.clientId, user.id))) {
      return fail("That client does not exist.", 404);
    }

    const invoice = await createInvoice({
      userId: user.id,
      input,
      currency: user.currency ?? "USD",
    });
    return ok(invoice, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
