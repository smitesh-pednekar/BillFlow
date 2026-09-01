import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/auth";
import { statusChangeSchema } from "@/lib/validators";
import { setInvoiceStatus } from "@/db/queries/invoices";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { status } = statusChangeSchema.parse(await req.json());

    const row = await setInvoiceStatus(id, userId, status);
    if (!row) return fail("That invoice does not exist.", 404);
    return ok(row);
  } catch (e) {
    return handleError(e);
  }
}
