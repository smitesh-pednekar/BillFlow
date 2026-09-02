"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button, Input, Textarea, Select, Field } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { InvoicePaper } from "@/components/invoice/InvoicePaper";
import { DraftWithAI, type DraftedItem } from "./DraftWithAI";
import { computeTotals, formatMoney, parseMoneyToCents, centsToDecimal } from "@/lib/money";
import { addDaysISO, todayISO, displayStatus, type InvoiceStatus } from "@/lib/invoice";
import type { DisplayStatus } from "@/lib/invoice";

export interface EditorClient {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

export interface EditorDefaults {
  currency: string;
  taxBps: number;
  netDays: number;
  businessName: string;
  businessEmail: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  logoUrl: string | null;
  invoiceFooter: string | null;
  notes: string | null;
  terms: string | null;
}

export interface EditorInvoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  clientId: string;
  issueDate: string;
  dueDate: string;
  discountKind: "none" | "percent" | "fixed";
  discountValue: number;
  taxBps: number;
  notes: string | null;
  terms: string | null;
  items: { description: string; quantity: number; unitCents: number }[];
}

/** Form shape keeps money as display strings; cents conversion happens on save. */
interface FormValues {
  clientId: string;
  issueDate: string;
  dueDate: string;
  discountKind: "none" | "percent" | "fixed";
  discountInput: string;
  taxInput: string;
  notes: string;
  terms: string;
  items: { description: string; quantity: string; rate: string }[];
}

export function InvoiceEditor({
  clients,
  defaults,
  invoice,
}: {
  clients: EditorClient[];
  defaults: EditorDefaults;
  invoice?: EditorInvoice;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!invoice;
  const [saving, setSaving] = React.useState<"draft" | "send" | null>(null);
  const [dueTouched, setDueTouched] = React.useState(isEdit);

  const { register, control, handleSubmit, watch, setValue } =
    useForm<FormValues>({
      defaultValues: invoice
        ? {
            clientId: invoice.clientId,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            discountKind: invoice.discountKind,
            discountInput:
              invoice.discountKind === "percent"
                ? String(invoice.discountValue / 100)
                : invoice.discountKind === "fixed"
                  ? centsToDecimal(invoice.discountValue)
                  : "",
            taxInput: invoice.taxBps ? String(invoice.taxBps / 100) : "",
            notes: invoice.notes ?? "",
            terms: invoice.terms ?? "",
            items: invoice.items.map((i) => ({
              description: i.description,
              quantity: String(i.quantity),
              rate: centsToDecimal(i.unitCents),
            })),
          }
        : {
            clientId: clients[0]?.id ?? "",
            issueDate: todayISO(),
            dueDate: addDaysISO(todayISO(), defaults.netDays),
            discountKind: "none",
            discountInput: "",
            taxInput: defaults.taxBps ? String(defaults.taxBps / 100) : "",
            notes: defaults.notes ?? "",
            terms: defaults.terms ?? "",
            items: [{ description: "", quantity: "1", rate: "" }],
          },
    });

  const { fields, append, remove, swap, replace } = useFieldArray({
    control,
    name: "items",
  });

  const values = watch();

  // Changing the issue date shifts the due date until the user touches it.
  const issueDate = values.issueDate;
  React.useEffect(() => {
    if (dueTouched || !issueDate) return;
    setValue("dueDate", addDaysISO(issueDate, defaults.netDays));
  }, [issueDate, dueTouched, defaults.netDays, setValue]);

  const parsedItems = (values.items ?? []).map((i) => ({
    quantity: Number(i.quantity) || 0,
    unitCents: parseMoneyToCents(i.rate ?? ""),
  }));

  const discountKind = values.discountKind ?? "none";
  const discountValue =
    discountKind === "percent"
      ? Math.round((Number(values.discountInput) || 0) * 100)
      : discountKind === "fixed"
        ? parseMoneyToCents(values.discountInput ?? "")
        : 0;
  const taxBps = Math.round((Number(values.taxInput) || 0) * 100);

  // The same engine the server uses — display only; the server recomputes.
  const totals = computeTotals({
    items: parsedItems,
    discountKind,
    discountValue,
    taxBps,
  });

  const selectedClient = clients.find((c) => c.id === values.clientId);

  const paperStatus: DisplayStatus = invoice
    ? displayStatus({ status: invoice.status, dueDate: values.dueDate })
    : "draft";

  /** A draft replaces the line items wholesale; everything stays editable. */
  function applyDraft(draft: {
    items: DraftedItem[];
    taxBps: number;
    notes: string | null;
  }) {
    replace(
      draft.items.map((i) => ({
        description: i.description,
        quantity: String(i.quantity),
        rate: centsToDecimal(i.unitCents),
      })),
    );
    if (draft.taxBps > 0) setValue("taxInput", String(draft.taxBps / 100));
    if (draft.notes) setValue("notes", draft.notes);
  }

  function payload() {
    return {
      clientId: values.clientId,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      discountKind,
      discountValue,
      taxBps,
      notes: values.notes ?? "",
      terms: values.terms ?? "",
      items: (values.items ?? [])
        .map((it, idx) => ({
          description: it.description?.trim() ?? "",
          quantity: parsedItems[idx].quantity,
          unitCents: parsedItems[idx].unitCents,
        }))
        .filter((it) => it.description.length > 0),
    };
  }

  async function save(mode: "draft" | "send") {
    const body = payload();

    if (!body.clientId) {
      toast("Pick a client first.", "error");
      return;
    }
    if (body.items.length === 0) {
      toast("Add at least one line item with a description.", "error");
      return;
    }

    setSaving(mode);
    try {
      const res = await fetch(
        isEdit ? `/api/invoices/${invoice!.id}` : "/api/invoices",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        toast(b.error ?? "Could not save this invoice.", "error");
        return;
      }

      const saved = await res.json();
      const id = isEdit ? invoice!.id : saved.id;

      if (mode === "send") {
        const sendRes = await fetch(`/api/invoices/${id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const sendBody = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) {
          toast(sendBody.error ?? "Saved, but sending failed.", "error");
        } else if (sendBody.emailed) {
          toast(`Invoice sent to ${sendBody.to}`);
        } else {
          toast("Invoice marked as sent — share the link from here.");
        }
      } else {
        toast(isEdit ? "Draft saved" : `Draft ${saved.number} created`);
      }

      router.push(`/invoices/${id}`);
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Add a client first
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          An invoice needs someone to bill. Add a client and their details fill
          in here automatically.
        </p>
        <Link
          href="/clients"
          className="mt-6 inline-flex h-11 items-center rounded-[6px] bg-pine-700 px-4 text-sm font-medium text-white hover:bg-pine-900"
        >
          Add a client
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(() => save("draft"))}
      className="px-4 py-8 sm:px-8"
      noValidate
    >
      <header className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {isEdit ? `Edit ${invoice!.number}` : "New invoice"}
          </h1>
          <p className="mt-0.5 text-sm text-ink-2">
            {isEdit
              ? "Changes save when you press Save."
              : "Fill in the work and watch the total update."}
          </p>
        </div>
        <div className="hidden gap-2 lg:flex">
          <Button
            type="button"
            variant="secondary"
            onClick={() => save("draft")}
            loading={saving === "draft"}
          >
            Save draft
          </Button>
          <Button
            type="button"
            onClick={() => save("send")}
            loading={saving === "send"}
          >
            Save and send
          </Button>
        </div>
      </header>

      {isEdit && invoice!.status !== "draft" && (
        <div className="mx-auto mt-4 max-w-[1320px] rounded-[6px] bg-ochre-50 px-4 py-3 text-[0.8125rem] text-ink">
          This invoice was already sent. Editing changes what your client sees.
        </div>
      )}

      <div className="mx-auto mt-6 grid max-w-[1320px] gap-8 lg:grid-cols-[55fr_45fr]">
        {/* ------------------------------------------------------ form --- */}
        <div className="space-y-6">
          <section className="rounded-[10px] border border-line bg-surface p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client" htmlFor="clientId" required className="sm:col-span-2">
                <Select id="clientId" {...register("clientId")}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Issue date" htmlFor="issueDate" required>
                <Input id="issueDate" type="date" {...register("issueDate")} />
              </Field>

              <Field
                label="Due date"
                htmlFor="dueDate"
                required
                hint={
                  dueTouched ? undefined : `Follows your ${defaults.netDays}-day terms.`
                }
              >
                <Input
                  id="dueDate"
                  type="date"
                  {...register("dueDate", {
                    onChange: () => setDueTouched(true),
                  })}
                />
              </Field>
            </div>
          </section>

          <DraftWithAI currency={defaults.currency} onApply={applyDraft} />

          <section className="rounded-[10px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink">Line items</h2>
              <span className="text-[0.8125rem] text-ink-3">
                {fields.length} item{fields.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="rounded-[6px] border border-line p-3"
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="sr-only" htmlFor={`desc-${idx}`}>
                        Description for line {idx + 1}
                      </label>
                      <Textarea
                        id={`desc-${idx}`}
                        rows={2}
                        placeholder="Landing page design — 3 concepts"
                        className="min-h-[44px]"
                        {...register(`items.${idx}.description` as const)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => idx > 0 && swap(idx, idx - 1)}
                        disabled={idx === 0}
                        aria-label={`Move line ${idx + 1} up`}
                        className="rounded-[6px] p-1.5 text-ink-3 hover:bg-sunken hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => idx < fields.length - 1 && swap(idx, idx + 1)}
                        disabled={idx === fields.length - 1}
                        aria-label={`Move line ${idx + 1} down`}
                        className="rounded-[6px] p-1.5 text-ink-3 hover:bg-sunken hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fields.length > 1 && remove(idx)}
                        disabled={fields.length === 1}
                        aria-label={`Remove line ${idx + 1}`}
                        className="rounded-[6px] p-1.5 text-ink-3 hover:bg-rust-50 hover:text-rust disabled:opacity-30"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <label
                        className="block text-[0.75rem] text-ink-3"
                        htmlFor={`qty-${idx}`}
                      >
                        Qty
                      </label>
                      <Input
                        id={`qty-${idx}`}
                        inputMode="decimal"
                        className="tnum h-9 text-right"
                        {...register(`items.${idx}.quantity` as const)}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[0.75rem] text-ink-3"
                        htmlFor={`rate-${idx}`}
                      >
                        Rate
                      </label>
                      <Input
                        id={`rate-${idx}`}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="tnum h-9 text-right"
                        {...register(`items.${idx}.rate` as const)}
                      />
                    </div>
                    <div>
                      <span className="block text-[0.75rem] text-ink-3">
                        Amount
                      </span>
                      <output
                        className="tnum flex h-9 items-center justify-end px-2 text-sm text-ink"
                        aria-live="polite"
                      >
                        {formatMoney(totals.lines[idx] ?? 0, defaults.currency)}
                      </output>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() =>
                append({ description: "", quantity: "1", rate: "" })
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Add line
            </Button>
          </section>

          <section className="rounded-[10px] border border-line bg-surface p-5">
            <h2 className="text-sm font-medium text-ink">Discount and tax</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Discount type" htmlFor="discountKind">
                <Select id="discountKind" {...register("discountKind")}>
                  <option value="none">No discount</option>
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </Select>
              </Field>
              <Field
                label={discountKind === "percent" ? "Discount %" : "Discount amount"}
                htmlFor="discountInput"
              >
                <Input
                  id="discountInput"
                  inputMode="decimal"
                  disabled={discountKind === "none"}
                  placeholder={discountKind === "percent" ? "10" : "0.00"}
                  className="tnum text-right"
                  {...register("discountInput")}
                />
              </Field>
              <Field label="Tax %" htmlFor="taxInput" hint="Applied after discount.">
                <Input
                  id="taxInput"
                  inputMode="decimal"
                  placeholder="0"
                  className="tnum text-right"
                  {...register("taxInput")}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[10px] border border-line bg-surface p-5">
            <div className="grid gap-4">
              <Field label="Notes" htmlFor="notes" hint="Shown to your client on the invoice.">
                <Textarea id="notes" rows={2} placeholder="Thanks for the work!" {...register("notes")} />
              </Field>
              <Field label="Terms" htmlFor="terms">
                <Textarea id="terms" rows={2} placeholder="Payment due within 14 days." {...register("terms")} />
              </Field>
            </div>
          </section>
        </div>

        {/* --------------------------------------------------- preview --- */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mb-2 text-[0.8125rem] font-medium text-ink-3">
              Preview
            </p>
            <InvoicePaper
              invoice={{
                // The number is allocated on save; the chip already says Draft.
                number: invoice?.number ?? "—",
                issueDate: values.issueDate,
                dueDate: values.dueDate,
                currency: defaults.currency,
                status: paperStatus,
                items: (values.items ?? []).map((it, i) => ({
                  description: it.description || "—",
                  quantity: parsedItems[i]?.quantity ?? 0,
                  unitCents: parsedItems[i]?.unitCents ?? 0,
                  amountCents: totals.lines[i] ?? 0,
                })),
                subtotalCents: totals.subtotal,
                discountCents: totals.discount,
                discountKind,
                discountValue,
                taxBps,
                taxCents: totals.tax,
                totalCents: totals.total,
                notes: values.notes,
                terms: values.terms,
                footer: defaults.invoiceFooter,
                billTo: {
                  name: selectedClient?.name ?? "—",
                  company: selectedClient?.company,
                  email: selectedClient?.email,
                },
                billFrom: {
                  name: defaults.businessName,
                  email: defaults.businessEmail,
                  address: defaults.businessAddress,
                  phone: defaults.businessPhone,
                  logoUrl: defaults.logoUrl,
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Sticky action bar on mobile: running total plus the primary action. */}
      <div className="no-print fixed inset-x-0 bottom-[56px] z-30 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 lg:hidden">
        <div>
          <p className="text-[0.75rem] text-ink-3">Total</p>
          <p className="tnum text-lg font-semibold text-ink" aria-live="polite">
            {formatMoney(totals.total, defaults.currency)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => save("draft")}
            loading={saving === "draft"}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => save("send")}
            loading={saving === "send"}
          >
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}
