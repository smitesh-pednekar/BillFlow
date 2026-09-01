"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type DisplayStatus } from "@/lib/invoice";

const CHIPS: DisplayStatus[] = ["draft", "sent", "overdue", "paid", "void"];

export function InvoiceFilters({
  clients,
  statusCounts,
}: {
  clients: { id: string; name: string }[];
  statusCounts: Record<DisplayStatus, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = params.get("status");
  const client = params.get("client") ?? "";
  const [q, setQ] = React.useState(params.get("q") ?? "");

  /** Filtering lives in the URL, so any view is shareable and survives reload. */
  const push = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page"); // any filter change returns to page one
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounce the search box so typing does not fire a query per keystroke.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [q, push]);

  const hasFilters = !!(status || client || params.get("q"));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by number or client"
            aria-label="Search invoices"
            className="pl-9"
          />
        </div>

        <Select
          value={client}
          onChange={(e) => push({ client: e.target.value || null })}
          aria-label="Filter by client"
          className="w-auto min-w-[160px]"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => push({ status: null })}
          className={cn(
            "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
            !status
              ? "bg-pine-700 text-white"
              : "bg-surface text-ink-2 border border-line hover:bg-sunken",
          )}
        >
          All
        </button>

        {CHIPS.map((s) => {
          const n = statusCounts[s] ?? 0;
          if (n === 0 && status !== s) return null;
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => push({ status: active ? null : s })}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                active
                  ? "bg-pine-700 text-white"
                  : "border border-line bg-surface text-ink-2 hover:bg-sunken",
              )}
            >
              {STATUS_LABEL[s]}
              <span className={cn("tnum ml-1.5", active ? "text-pine-100" : "text-ink-3")}>
                {n}
              </span>
            </button>
          );
        })}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              router.replace(pathname, { scroll: false });
            }}
            className="ml-1 inline-flex items-center gap-1 text-[0.8125rem] text-ink-3 hover:text-ink"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function SortableHeader({
  label,
  sortKey,
  align = "left",
}: {
  label: string;
  sortKey: string;
  align?: "left" | "right";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const current = params.get("sort") ?? "date";
  const dir = params.get("dir") ?? "desc";
  const active = current === sortKey;

  function toggle() {
    const next = new URLSearchParams(params.toString());
    next.set("sort", sortKey);
    next.set("dir", active && dir === "desc" ? "asc" : "desc");
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[0.8125rem] font-medium",
        align === "right" ? "text-right" : "text-left",
      )}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-ink",
          active ? "text-ink" : "text-ink-2",
        )}
      >
        {label}
        <span aria-hidden="true" className="text-[0.6875rem]">
          {active ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}
