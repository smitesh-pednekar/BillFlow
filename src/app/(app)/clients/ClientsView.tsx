"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";
import { Button, Input, Textarea, Field } from "@/components/ui";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/states";
import { clientSchema, type ClientInput } from "@/lib/validators";
import { formatMoney } from "@/lib/money";
import type { ClientRow } from "@/db/queries/clients";

export function ClientsView({
  clients,
  currency,
}: {
  clients: ClientRow[];
  currency: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState<ClientRow | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ClientRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((c) =>
      [c.name, c.company, c.email].some((v) =>
        v?.toLowerCase().includes(needle),
      ),
    );
  }, [clients, q]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({ resolver: zodResolver(clientSchema) });

  function openNew() {
    setEditing(null);
    reset({ name: "", email: "", company: "", address: "", phone: "" });
    setSheetOpen(true);
  }

  function openEdit(c: ClientRow) {
    setEditing(c);
    reset({
      name: c.name,
      email: c.email ?? "",
      company: c.company ?? "",
      address: c.address ?? "",
      phone: c.phone ?? "",
    });
    setSheetOpen(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    const res = await fetch(
      editing ? `/api/clients/${editing.id}` : "/api/clients",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast(b.error ?? "Could not save that client.", "error");
      return;
    }
    setSheetOpen(false);
    toast(editing ? "Client updated" : `${values.name} added`);
    router.refresh();
  });

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/clients/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast(b.error ?? "Could not remove that client.", "error");
      return;
    }
    const body = await res.json();
    toast(
      body.archived
        ? `${deleting.name} archived — their invoices are kept`
        : `${deleting.name} deleted`,
    );
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Clients
          </h1>
          <p className="mt-0.5 text-sm text-ink-2">
            {clients.length === 0
              ? "The people you bill."
              : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" aria-hidden="true" />
          Add client
        </Button>
      </header>

      {clients.length > 0 && (
        <div className="relative mt-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients"
            aria-label="Search clients"
            className="pl-9"
          />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgb(23_26_23_/_0.06)]">
        {clients.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No clients yet"
            body="Add a client and their details will fill in on every invoice."
            action={{ label: "Add client", onClick: openNew }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No clients match that search"
            body="Try a different name, company, or email."
            action={{ label: "Clear search", onClick: () => setQ("") }}
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full sm:table">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  <th className="px-4 py-2.5 text-[0.8125rem] font-medium text-ink-2">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-[0.8125rem] font-medium text-ink-2">
                    Company
                  </th>
                  <th className="px-4 py-2.5 text-right text-[0.8125rem] font-medium text-ink-2">
                    Billed
                  </th>
                  <th className="px-4 py-2.5 text-right text-[0.8125rem] font-medium text-ink-2">
                    Outstanding
                  </th>
                  <th className="w-24 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-canvas">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-ink">{c.name}</div>
                      {c.email && (
                        <div className="text-[0.8125rem] text-ink-3">
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-2">
                      {c.company || "—"}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-sm text-ink">
                      {formatMoney(c.billedCents, currency)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-sm">
                      <span className={c.outstandingCents > 0 ? "text-ink" : "text-ink-3"}>
                        {formatMoney(c.outstandingCents, currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.name}`}
                          className="rounded-[6px] p-2 text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(c)}
                          aria-label={`Remove ${c.name}`}
                          className="rounded-[6px] p-2 text-ink-3 transition-colors hover:bg-rust-50 hover:text-rust"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-line sm:hidden">
              {filtered.map((c) => (
                <li key={c.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {c.name}
                      </p>
                      {c.company && (
                        <p className="truncate text-[0.8125rem] text-ink-2">
                          {c.company}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        aria-label={`Edit ${c.name}`}
                        className="rounded-[6px] p-2.5 text-ink-3 hover:bg-sunken"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(c)}
                        aria-label={`Remove ${c.name}`}
                        className="rounded-[6px] p-2.5 text-ink-3 hover:bg-rust-50 hover:text-rust"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-[0.8125rem]">
                    <span className="text-ink-3">
                      Billed{" "}
                      <span className="tnum text-ink">
                        {formatMoney(c.billedCents, currency)}
                      </span>
                    </span>
                    <span className="text-ink-3">
                      Outstanding{" "}
                      <span className="tnum text-ink">
                        {formatMoney(c.outstandingCents, currency)}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit client" : "Add client"}
        description={
          editing
            ? "Changes apply to new invoices. Invoices you already sent keep their original details."
            : "Their details fill in automatically on every invoice."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={isSubmitting}>
              {editing ? "Save changes" : "Add client"}
            </Button>
          </div>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="c-name" error={errors.name?.message} required>
            <Input id="c-name" placeholder="Maya Rodriguez" invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label="Company" htmlFor="c-company" error={errors.company?.message}>
            <Input id="c-company" placeholder="Studio Kestrel" {...register("company")} />
          </Field>
          <Field label="Email" htmlFor="c-email" error={errors.email?.message} hint="Where invoices get sent.">
            <Input id="c-email" type="email" placeholder="maya@studio.co" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Phone" htmlFor="c-phone" error={errors.phone?.message}>
            <Input id="c-phone" placeholder="+1 555 0100" {...register("phone")} />
          </Field>
          <Field label="Address" htmlFor="c-address" error={errors.address?.message} hint="Appears in the Bill to block.">
            <Textarea id="c-address" rows={3} placeholder={"12 Wharf Road\nBristol BS1 4RN"} {...register("address")} />
          </Field>
        </form>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        destructive={deleting?.invoiceCount === 0}
        title={
          deleting && deleting.invoiceCount > 0
            ? `Archive ${deleting.name}?`
            : `Delete ${deleting?.name}?`
        }
        confirmLabel={
          deleting && deleting.invoiceCount > 0 ? "Archive client" : "Delete client"
        }
        body={
          deleting && deleting.invoiceCount > 0 ? (
            <>
              {deleting.name} has {deleting.invoiceCount} invoice
              {deleting.invoiceCount === 1 ? "" : "s"}, so they will be archived
              instead of deleted. The invoices stay in your history.
            </>
          ) : (
            <>This removes {deleting?.name} permanently. It cannot be undone.</>
          )
        }
      />
    </div>
  );
}
