"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function PayButton({
  token,
  amountLabel,
  compact,
}: {
  token: string;
  amountLabel: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${token}/checkout`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not start the payment.");
        return;
      }

      // Stripe configured: hand off to Checkout. Otherwise the server settled
      // it in test mode and we just refresh into the paid state.
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "text-right"}>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className={cn(
          "inline-flex items-center justify-center rounded-[6px] bg-pine-700 font-medium text-white",
          "transition-colors hover:bg-pine-900 disabled:opacity-60",
          compact ? "h-11 px-4 text-sm" : "h-12 px-6 text-base",
        )}
      >
        {busy ? "Starting…" : compact ? "Pay now" : `Pay ${amountLabel}`}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
