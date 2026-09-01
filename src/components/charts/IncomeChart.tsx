"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import type { MonthPoint } from "@/db/queries/dashboard";

/** Rounds up to a readable 1/2/5 x 10^n step. */
function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const norm = raw / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return mult * mag;
}

/** "2026-09" -> "Sep" */
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function IncomeChart({
  data,
  currency,
}: {
  data: MonthPoint[];
  currency: string;
}) {
  const hasIncome = data.some((d) => d.cents > 0);

  if (!hasIncome) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center rounded-[6px] bg-canvas text-center">
        <p className="text-sm text-ink-2">No income to chart yet.</p>
        <p className="mt-0.5 text-[0.8125rem] text-ink-3">
          Paid invoices appear here as you get paid.
        </p>
      </div>
    );
  }

  const points = data.map((d) => ({
    month: monthLabel(d.month),
    ym: d.month,
    amount: d.cents / 100,
  }));

  // Evenly spaced ticks on a rounded ceiling — Recharts' automatic ticks land
  // on uneven values like 0, 2k, 3k, 5k, 6k.
  const peak = Math.max(...points.map((p) => p.amount), 1);
  const step = niceStep(peak / 4);
  const yMax = step * 4;
  const yTicks = [0, step, step * 2, step * 3, yMax];

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
        >
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12433A" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#12433A" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Recessive grid: horizontal only, no vertical rules. */}
          <CartesianGrid
            stroke="#DDE1DA"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#8C938B", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: "#8C938B", fontSize: 12 }}
            domain={[0, yMax]}
            ticks={yTicks}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            cursor={{ stroke: "#8C938B", strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #DDE1DA",
              boxShadow: "0 12px 32px rgb(23 26 23 / 0.12)",
              fontSize: 13,
            }}
            labelStyle={{ color: "#5C625C", marginBottom: 2 }}
            formatter={(value) => [
              formatMoney(Math.round(Number(value ?? 0) * 100), currency),
              "Paid",
            ]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#12433A"
            strokeWidth={2}
            fill="url(#incomeFill)"
            activeDot={{ r: 4, fill: "#12433A", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
