import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceEvents, type PartySnapshot } from "@/db/schema";
import { getCurrentUser, requireUserId } from "@/lib/auth";
import { findInvoice } from "@/db/queries/invoices";
import { sendInvoiceEmail } from "@/lib/email";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const user = (await getCurrentUser())!;
    const { id } = await params;

    const invoice = await findInvoice(id, userId);
    if (!invoice) return fail("That invoice does not exist.", 404);
    if (invoice.status === "void") {
      return fail("This invoice is void. Restore it to a draft first.", 409);
    }
    if (!invoice.items.length) {
      return fail("Add at least one line item before sending.", 422);
    }

    const body = await req.json().catch(() => ({}));
    const to: string | undefined = body.to ?? invoice.client.email ?? undefined;

    /**
     * Snapshot both parties at send time. Editing a client's address next month
     * must not silently rewrite an invoice the client has already received.
     * Re-sending does not re-snapshot: the first send is the record.
     */
    const billTo: PartySnapshot = invoice.billTo ?? {
      name: invoice.client.name,
      email: invoice.client.email,
      company: invoice.client.company,
      address: invoice.client.address,
      phone: invoice.client.phone,
    };
    const billFrom: PartySnapshot = invoice.billFrom ?? {
      name: user.businessName || user.name,
      email: user.businessEmail || user.email,
      address: user.businessAddress,
      phone: user.businessPhone,
      logoUrl: user.logoUrl,
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const link = `${appUrl}/i/${invoice.publicToken}`;

    await db
      .update(invoices)
      .set({
        status: invoice.status === "paid" ? "paid" : "sent",
        billTo,
        billFrom,
        sentAt: invoice.sentAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

    // A failed email must never break the send. The invoice is still sent and
    // the shareable link still works.
    let emailed = false;
    let emailError: string | null = null;
    if (to) {
      const result = await sendInvoiceEmail({
        to,
        subject: body.subject,
        message: body.message,
        invoiceNumber: invoice.number,
        totalCents: invoice.totalCents,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        businessName: billFrom.name,
        link,
      });
      emailed = result.sent;
      emailError = result.error;
    }

    await db.insert(invoiceEvents).values({
      invoiceId: id,
      kind: "sent",
      meta: { to: to ?? null, emailed, emailError },
    });

    return ok({ link, emailed, emailError, to: to ?? null });
  } catch (e) {
    return handleError(e);
  }
}
