import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings — BillFlow" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-ink-2">
          Your details and the defaults every new invoice starts from.
        </p>
      </header>

      <div className="mt-6">
        <SettingsForm
          nextInvoiceNo={user.nextInvoiceNo}
          defaults={{
            name: user.name,
            businessName: user.businessName ?? "",
            businessEmail: user.businessEmail ?? "",
            businessAddress: user.businessAddress ?? "",
            businessPhone: user.businessPhone ?? "",
            logoUrl: user.logoUrl ?? "",
            currency: user.currency ?? "GBP",
            invoicePrefix: user.invoicePrefix,
            defaultTaxBps: user.defaultTaxBps,
            defaultNetDays: user.defaultNetDays,
            invoiceFooter: user.invoiceFooter ?? "",
          }}
        />
      </div>
    </div>
  );
}
