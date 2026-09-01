/**
 * Every currency calculation in BillFlow passes through this module.
 * Money is integer cents. Percentages are basis points (1850 = 18.50%).
 * Nothing anywhere else is allowed to multiply or divide a money value.
 */

export const round = (n: number) => Math.round(n + Number.EPSILON);

export type DiscountKind = "none" | "percent" | "fixed";

export interface TotalsInput {
  items: { quantity: number; unitCents: number }[];
  discountKind: DiscountKind;
  /** basis points when percent, cents when fixed */
  discountValue: number;
  taxBps: number;
}

export interface Totals {
  /** per-line amounts, rounded once each */
  lines: number[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Discount applies BEFORE tax; tax is a single rate on the discounted
 * subtotal. Rounding happens once per line and once per total, so
 * fractional cents never accumulate.
 */
export function computeTotals(input: TotalsInput): Totals {
  const lines = input.items.map((i) =>
    round((Number(i.quantity) || 0) * (Number(i.unitCents) || 0)),
  );
  const subtotal = lines.reduce((a, b) => a + b, 0);

  const discount =
    input.discountKind === "percent"
      ? round((subtotal * input.discountValue) / 10_000)
      : input.discountKind === "fixed"
        ? Math.min(Math.max(input.discountValue, 0), subtotal)
        : 0;

  const taxable = subtotal - discount;
  const tax = round((taxable * input.taxBps) / 10_000);

  return { lines, subtotal, discount, tax, total: taxable + tax };
}

export function formatMoney(
  cents: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parses user input like "1,250.50" or "$1250.5" into cents. */
export function parseMoneyToCents(input: string | number): number {
  if (typeof input === "number") return round(input * 100);
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  return round(Number.parseFloat(cleaned) * 100) || 0;
}

export const centsToDecimal = (cents: number) => (cents / 100).toFixed(2);

/** 1850 -> "18.5" */
export const bpsToPercent = (bps: number) => String(bps / 100);

/** "18.5" -> 1850 */
export const percentToBps = (pct: string | number) =>
  round((Number(pct) || 0) * 100);
