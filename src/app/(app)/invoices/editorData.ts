import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { clientOptions } from "@/db/queries/clients";
import type { EditorDefaults } from "./InvoiceEditor";

export async function getEditorData() {
  const user = (await getCurrentUser())!;
  const clients = await clientOptions(user.id);

  const defaults: EditorDefaults = {
    currency: user.currency ?? "USD",
    taxBps: user.defaultTaxBps,
    netDays: user.defaultNetDays,
    businessName: user.businessName || user.name,
    businessEmail: user.businessEmail || user.email,
    businessAddress: user.businessAddress,
    businessPhone: user.businessPhone,
    logoUrl: user.logoUrl,
    invoiceFooter: user.invoiceFooter,
    notes: null,
    terms: null,
  };

  return { user, clients, defaults };
}
