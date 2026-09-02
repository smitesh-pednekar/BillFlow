import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceEvents, payments } from "@/db/schema";
import { findInvoiceByToken } from "@/db/queries/invoices";
import { displayStatus } from "@/lib/invoice";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Public endpoint: authenticated by the unguessable token alone, so it does
 * the minimum — start a payment for one invoice, nothing else.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const invoice = await findInvoiceByToken(token);
    if (!invoice || invoice.status === "void") {
      return fail("That invoice is not available.", 404);
    }

    const status = displayStatus({
      status: invoice.status,
      dueDate: invoice.dueDate,
    });
    if (status === "paid") return fail("This invoice is already paid.", 409);
    if (invoice.totalCents <= 0) {
      return fail("This invoice has nothing to pay.", 422);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.STRIPE_SECRET_KEY;

    // No usable Stripe key: settle in test mode so the flow is still
    // demonstrable. The brief allows a simulated payment.
    // The length check matters because a bare `sk_test_` placeholder copied
    // from .env.example would otherwise pass a prefix-only test and break
    // checkout rather than falling back.
    const usableStripeKey =
      !!secret && /^sk_(test|live)_.+/.test(secret) && secret.length > 20;

    if (!usableStripeKey) {
      await db
        .update(invoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          paidCents: invoice.totalCents,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));

      await db.insert(payments).values({
        invoiceId: invoice.id,
        provider: "manual",
        providerRef: `sim_${invoice.id}`,
        amountCents: invoice.totalCents,
        status: "succeeded",
      });

      await db.insert(invoiceEvents).values({
        invoiceId: invoice.id,
        kind: "paid",
        meta: { simulated: true },
      });

      return ok({ url: null, simulated: true });
    }

    // Stripe Checkout. Amounts are sent in the same integer cents we store.
    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": invoice.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(invoice.totalCents),
      "line_items[0][price_data][product_data][name]": `Invoice ${invoice.number}`,
      success_url: `${appUrl}/i/${token}?paid=1`,
      cancel_url: `${appUrl}/i/${token}`,
      client_reference_id: invoice.id,
      "metadata[invoiceId]": invoice.id,
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      console.error("[stripe]", await res.text().catch(() => ""));
      return fail("Could not start the payment. Please try again.", 502);
    }

    const session = await res.json();

    await db.insert(payments).values({
      invoiceId: invoice.id,
      provider: "stripe",
      providerRef: session.id,
      amountCents: invoice.totalCents,
      status: "pending",
    });

    return ok({ url: session.url });
  } catch (e) {
    return handleError(e);
  }
}
