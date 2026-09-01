import type { Metadata } from "next";
import { InvoiceEditor } from "../InvoiceEditor";
import { getEditorData } from "../editorData";

export const metadata: Metadata = { title: "New invoice — BillFlow" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const { clients, defaults } = await getEditorData();
  return <InvoiceEditor clients={clients} defaults={defaults} />;
}
