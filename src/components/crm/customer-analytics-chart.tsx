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

const fmt = (v: number) =>
  Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

export function CustomerRevenueTrend({
  data,
}: {
  data: { month: string; revenue: number }[];
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="custRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e3b04f" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#e3b04f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--contrast) / 0.45)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(m: string) => m.slice(5)}
          />
          <YAxis
            stroke="hsl(var(--contrast) / 0.35)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${fmt(v)}`}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover) / 0.97)",
              border: "1px solid hsl(var(--contrast) / 0.12)",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: number | string) => [`$${fmt(Number(v))}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#e3b04f"
            strokeWidth={2}
            fill="url(#custRev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
