import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvoiceEditor } from "../../InvoiceEditor";
import { getEditorData } from "../../editorData";
import { findInvoice, sortItems } from "@/db/queries/invoices";

export const metadata: Metadata = { title: "Edit invoice — BillFlow" };
export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, clients, defaults } = await getEditorData();

  const invoice = await findInvoice(id, user.id);
  if (!invoice) notFound();

  return (
    <InvoiceEditor
      clients={clients}
      defaults={defaults}
      invoice={{
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        clientId: invoice.clientId,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        discountKind: invoice.discountKind,
        discountValue: invoice.discountValue,
        taxBps: invoice.taxBps,
        notes: invoice.notes,
        terms: invoice.terms,
        items: sortItems(invoice.items).map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitCents: i.unitCents,
        })),
      }}
    />
  );
}
