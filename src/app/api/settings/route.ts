import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { settingsSchema } from "@/lib/validators";
import { requireUserId } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const input = settingsSchema.parse(await req.json());

    const [row] = await db
      .update(users)
      .set({
        name: input.name,
        businessName: input.businessName || null,
        businessEmail: input.businessEmail || null,
        businessAddress: input.businessAddress || null,
        businessPhone: input.businessPhone || null,
        logoUrl: input.logoUrl || null,
        currency: input.currency,
        invoicePrefix: input.invoicePrefix,
        defaultTaxBps: input.defaultTaxBps,
        defaultNetDays: input.defaultNetDays,
        invoiceFooter: input.invoiceFooter || null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!row) return fail("Could not find your account.", 404);
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
