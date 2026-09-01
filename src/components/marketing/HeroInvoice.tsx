"use client";

import * as React from "react";
import { formatMoney } from "@/lib/money";

const ITEMS = [
  { description: "Brand identity — logo and type system", amount: 120000 },
  { description: "Landing page design, 3 concepts", amount: 78000 },
  { description: "Frontend build, 16 hrs", amount: 42000 },
];

const TOTAL = ITEMS.reduce((a, b) => a + b.amount, 0);

/**
 * The single orchestrated moment on the site: a real invoice filling itself
 * in. Everything else on the page stays still. Guarded for reduced motion,
 * where it simply renders finished.
 */
export function HeroInvoice() {
  const [step, setStep] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Reduced motion: render finished, on a tick so the effect never sets
    // state synchronously.
    if (reduced) {
      const t = setTimeout(() => {
        setStep(ITEMS.length + 1);
        setCount(TOTAL);
      }, 0);
      return () => clearTimeout(t);
    }

    const timers = ITEMS.map((_, i) =>
      setTimeout(() => setStep(i + 1), 320 + i * 260),
    );
    const done = setTimeout(
      () => setStep(ITEMS.length + 1),
      320 + ITEMS.length * 260,
    );

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, []);

  // Count the total up once the lines have landed.
  React.useEffect(() => {
    if (step <= ITEMS.length) return;
    if (count >= TOTAL) return;

    const start = performance.now();
    const from = count;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 520);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(from + (TOTAL - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const sent = step > ITEMS.length;

  return (
    <div className="relative">
      <div className="border border-line bg-surface px-6 py-7 shadow-[0_12px_32px_rgb(23_26_23_/_0.12)] sm:px-8 sm:py-9">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Kestrel Studio</p>
            <p className="text-[0.8125rem] text-ink-2">billing@kestrel.studio</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-ink">
              Invoice
            </p>
            <p className="tnum text-[0.8125rem] text-ink-2">KS-0042</p>
            <span
              className={[
                "mt-2 inline-block rounded-full px-2.5 py-1 text-[0.75rem] font-medium",
                "transition-colors duration-300",
                sent
                  ? "bg-indigo-50 text-indigo"
                  : "bg-slate-50 text-slate",
              ].join(" ")}
            >
              {sent ? "Sent" : "Draft"}
            </span>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[0.75rem] font-medium text-ink-3">Bill to</p>
            <p className="mt-1 text-[0.8125rem] text-ink">Northwind Studio</p>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium text-ink-3">Issued</p>
            <p className="tnum mt-1 text-[0.8125rem] text-ink">3 Aug 2026</p>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium text-ink-3">Due</p>
            <p className="tnum mt-1 text-[0.8125rem] text-ink">17 Aug 2026</p>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-[0.75rem] font-medium text-ink-3">
              Description
            </span>
            <span className="text-[0.75rem] font-medium text-ink-3">Amount</span>
          </div>

          <ul>
            {ITEMS.map((item, i) => (
              <li
                key={item.description}
                className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2.5 transition-all duration-300 motion-reduce:transition-none"
                style={{
                  opacity: step > i ? 1 : 0,
                  transform: step > i ? "translateY(0)" : "translateY(4px)",
                }}
              >
                <span className="text-[0.8125rem] text-ink">
                  {item.description}
                </span>
                <span className="tnum shrink-0 text-[0.8125rem] text-ink">
                  {formatMoney(item.amount, "GBP")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="tnum font-display text-2xl font-semibold text-ink">
            {formatMoney(count, "GBP")}
          </span>
        </div>
      </div>
    </div>
  );
}
