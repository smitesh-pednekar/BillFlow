import type { PaperInvoice } from "@/components/invoice/InvoicePaper";
import { displayStatus, type InvoiceStatus } from "@/lib/invoice";
import type { PartySnapshot } from "@/db/schema";

interface Row {
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  discountKind: "none" | "percent" | "fixed";
  discountValue: number;
  taxBps: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  terms: string | null;
  billTo: PartySnapshot | null;
  billFrom: PartySnapshot | null;
  items: {
    position: number;
    description: string;
    quantity: string | number;
    unitCents: number;
    amountCents: number;
  }[];
  client: {
    name: string;
    email: string | null;
    company: string | null;
    address: string | null;
    phone: string | null;
  };
}

interface Business {
  name: string;
  businessName: string | null;
  email: string;
  businessEmail: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  logoUrl: string | null;
  invoiceFooter: string | null;
}

/**
 * One mapping from a database row to the shape both the on-screen paper and
 * the PDF consume. Anywhere an invoice is rendered, it comes through here, so
 * the three surfaces cannot disagree about what an invoice says.
 *
 * Snapshots win when present: what the client received is the record.
 */
export function toPaperInvoice(row: Row, business: Business): PaperInvoice {
  return {
    number: row.number,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency,
    status: displayStatus({ status: row.status, dueDate: row.dueDate }),
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitCents: i.unitCents,
        amountCents: i.amountCents,
      })),
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    discountKind: row.discountKind,
    discountValue: row.discountValue,
    taxBps: row.taxBps,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    notes: row.notes,
    terms: row.terms,
    footer: business.invoiceFooter,
    billTo: row.billTo ?? {
      name: row.client.name,
      email: row.client.email,
      company: row.client.company,
      address: row.client.address,
      phone: row.client.phone,
    },
    billFrom: row.billFrom ?? {
      name: business.businessName || business.name,
      email: business.businessEmail || business.email,
      address: business.businessAddress,
      phone: business.businessPhone,
      logoUrl: business.logoUrl,
    },
  };
}
