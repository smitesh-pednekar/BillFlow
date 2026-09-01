import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceEvents, payments } from "@/db/schema";
import { ok, fail } from "@/lib/api";

// The raw body is required for signature verification, so this must run on
// Node and must not be parsed before it is checked.
export const runtime = "nodejs";

function verify(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return fail("Webhooks are not configured.", 501);

  const raw = await req.text();
  if (!verify(raw, req.headers.get("stripe-signature"), secret)) {
    return fail("Invalid signature.", 400);
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return fail("Malformed payload.", 400);
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return ok({ ignored: event.type });
  }

  const session = event.data.object;
  const invoiceId =
    (session.client_reference_id as string) ??
    ((session.metadata as Record<string, string>)?.invoiceId ?? null);
  if (!invoiceId) return ok({ ignored: "no invoice reference" });

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!invoice) return ok({ ignored: "unknown invoice" });

  /**
   * Idempotency: the unique index on (provider, provider_ref) means a retried
   * event cannot insert a second payment, so it cannot double-pay.
   */
  const inserted = await db
    .insert(payments)
    .values({
      invoiceId,
      provider: "stripe",
      providerRef: String(session.id),
      amountCents: Number(session.amount_total ?? invoice.totalCents),
      status: "succeeded",
    })
    .onConflictDoUpdate({
      target: [payments.provider, payments.providerRef],
      set: { status: "succeeded" },
    })
    .returning({ id: payments.id });

  if (invoice.status !== "paid") {
    await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidCents: invoice.totalCents,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    await db.insert(invoiceEvents).values({
      invoiceId,
      kind: "paid",
      meta: { provider: "stripe", session: String(session.id) },
    });
  }

  return ok({ received: true, payment: inserted[0]?.id ?? null });
}
