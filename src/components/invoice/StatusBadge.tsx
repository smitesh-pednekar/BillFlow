import { cn } from "@/lib/utils";
import { STATUS_LABEL, type DisplayStatus } from "@/lib/invoice";

/**
 * One chip, five states. Rust appears only on real overdue money, so when a
 * reader sees it, it means something.
 */
const STYLES: Record<DisplayStatus, { chip: string; dot: string }> = {
  draft: {
    chip: "bg-slate-50 text-slate",
    dot: "ring-1 ring-slate bg-transparent",
  },
  sent: { chip: "bg-indigo-50 text-indigo", dot: "bg-indigo" },
  paid: { chip: "bg-pine-100 text-pine-700", dot: "bg-pine-700" },
  overdue: { chip: "bg-rust-50 text-rust", dot: "bg-rust" },
  void: { chip: "bg-sunken text-ink-3", dot: "ring-1 ring-ink-3 bg-transparent" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: DisplayStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[0.75rem] font-medium leading-none",
        s.chip,
        className,
      )}
    >
      {status === "paid" ? (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <path
            d="M2.5 6.5L4.75 8.75L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden="true" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
