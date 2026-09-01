"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Textarea, Select, Field } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { settingsSchema, type SettingsInput } from "@/lib/validators";
import type { z } from "zod";
import { formatInvoiceNumber } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";

const CURRENCIES = [
  ["GBP", "British pound"],
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["INR", "Indian rupee"],
  ["AUD", "Australian dollar"],
  ["CAD", "Canadian dollar"],
];

/** The form holds the schema's INPUT shape: numeric fields arrive as strings. */
type SettingsFormValues = z.input<typeof settingsSchema>;

export function SettingsForm({
  defaults,
  nextInvoiceNo,
}: {
  defaults: SettingsInput;
  nextInvoiceNo: number;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as never,
    defaultValues: defaults as SettingsFormValues,
  });

  const values = watch();

  const onSubmit = handleSubmit(async (input) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast(b.error ?? "Could not save your settings.", "error");
      return;
    }
    reset(input);
    toast("Settings saved");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="pb-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-[10px] border border-line bg-surface p-5">
            <h2 className="text-sm font-medium text-ink">Your business</h2>
            <p className="mt-0.5 text-[0.8125rem] text-ink-2">
              This is the “from” block on every invoice.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="s-name" error={errors.name?.message} required>
                <Input id="s-name" {...register("name")} invalid={!!errors.name} />
              </Field>
              <Field label="Business name" htmlFor="s-business" error={errors.businessName?.message}>
                <Input id="s-business" placeholder="Kestrel Studio" {...register("businessName")} />
              </Field>
              <Field label="Billing email" htmlFor="s-email" error={errors.businessEmail?.message}>
                <Input id="s-email" type="email" {...register("businessEmail")} invalid={!!errors.businessEmail} />
              </Field>
              <Field label="Phone" htmlFor="s-phone" error={errors.businessPhone?.message}>
                <Input id="s-phone" {...register("businessPhone")} />
              </Field>
              <Field label="Address" htmlFor="s-address" error={errors.businessAddress?.message} className="sm:col-span-2">
                <Textarea id="s-address" rows={3} {...register("businessAddress")} />
              </Field>
              <Field
                label="Logo URL"
                htmlFor="s-logo"
                error={errors.logoUrl?.message}
                hint="Paste a link to your logo. It appears on invoices and the public page."
                className="sm:col-span-2"
              >
                <Input id="s-logo" placeholder="https://…" {...register("logoUrl")} invalid={!!errors.logoUrl} />
              </Field>
            </div>
          </section>

          <section className="rounded-[10px] border border-line bg-surface p-5">
            <h2 className="text-sm font-medium text-ink">Invoice defaults</h2>
            <p className="mt-0.5 text-[0.8125rem] text-ink-2">
              Applied to every new invoice. You can override them per invoice.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Currency" htmlFor="s-currency" error={errors.currency?.message}>
                <Select id="s-currency" {...register("currency")}>
                  {CURRENCIES.map(([code, label]) => (
                    <option key={code} value={code}>
                      {code} — {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Invoice prefix"
                htmlFor="s-prefix"
                error={errors.invoicePrefix?.message}
                hint={`Next invoice: ${formatInvoiceNumber(values.invoicePrefix || "", nextInvoiceNo)}`}
              >
                <Input id="s-prefix" {...register("invoicePrefix")} invalid={!!errors.invoicePrefix} />
              </Field>
              <Field
                label="Default tax rate"
                htmlFor="s-tax"
                error={errors.defaultTaxBps?.message}
                hint="In basis points: 2000 is 20%."
              >
                <Input id="s-tax" inputMode="numeric" className="tnum" {...register("defaultTaxBps")} />
              </Field>
              <Field
                label="Payment terms"
                htmlFor="s-net"
                error={errors.defaultNetDays?.message}
                hint="Days until an invoice is due."
              >
                <Input id="s-net" inputMode="numeric" className="tnum" {...register("defaultNetDays")} />
              </Field>
              <Field
                label="Invoice footer"
                htmlFor="s-footer"
                error={errors.invoiceFooter?.message}
                hint="Registration or tax numbers, a thank-you line."
                className="sm:col-span-2"
              >
                <Textarea id="s-footer" rows={2} {...register("invoiceFooter")} />
              </Field>
            </div>
          </section>
        </div>

        {/* Live preview so a change is visible before it is saved. */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mb-2 text-[0.8125rem] font-medium text-ink-3">
              How it looks
            </p>
            <div className="border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(23_26_23_/_0.06)]">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {values.businessName || values.name || "Your business"}
                  </p>
                  {values.businessEmail && (
                    <p className="truncate text-[0.8125rem] text-ink-2">
                      {values.businessEmail}
                    </p>
                  )}
                  {values.businessAddress && (
                    <p className="mt-0.5 whitespace-pre-line text-[0.75rem] text-ink-2">
                      {values.businessAddress}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-base font-semibold text-ink">
                    Invoice
                  </p>
                  <p className="tnum text-[0.75rem] text-ink-2">
                    {formatInvoiceNumber(values.invoicePrefix || "", nextInvoiceNo)}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-line pt-3">
                <div className="flex justify-between text-[0.8125rem]">
                  <span className="text-ink-2">Subtotal</span>
                  <span className="tnum text-ink">
                    {formatMoney(100000, values.currency || "GBP")}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-[0.8125rem]">
                  <span className="text-ink-2">
                    Tax ({(Number(values.defaultTaxBps) || 0) / 100}%)
                  </span>
                  <span className="tnum text-ink">
                    {formatMoney(
                      Math.round((100000 * (Number(values.defaultTaxBps) || 0)) / 10000),
                      values.currency || "GBP",
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
                  <span className="text-[0.8125rem] font-medium text-ink">
                    Total
                  </span>
                  <span className="tnum font-display text-lg font-semibold text-ink">
                    {formatMoney(
                      100000 +
                        Math.round((100000 * (Number(values.defaultTaxBps) || 0)) / 10000),
                      values.currency || "GBP",
                    )}
                  </span>
                </div>
              </div>

              {values.invoiceFooter && (
                <p className="mt-4 border-t border-line pt-3 text-[0.75rem] text-ink-3">
                  {values.invoiceFooter}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky save bar, only once something has changed. */}
      {isDirty && (
        <div className="no-print fixed inset-x-0 bottom-[56px] z-30 border-t border-line bg-surface px-4 py-3 lg:bottom-0">
          <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
            <p className="text-[0.8125rem] text-ink-2">
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => reset(defaults)}
              >
                Discard
              </Button>
              <Button type="submit" size="sm" loading={isSubmitting}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
