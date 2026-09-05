"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtAxis = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);

/** Single series → one brand hue, no legend; thin rounded bars on a recessive grid. */
export function RevenueBars({ data }: { data: { month: string; revenue: number }[] }) {
  const empty = data.every((d) => d.revenue === 0);
  if (empty) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
        No invoiced revenue in the last six months yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
        <XAxis dataKey="month" stroke="hsl(var(--contrast) / 0.35)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--contrast) / 0.35)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtAxis} width={48} />
        <Tooltip
          cursor={{ fill: "hsl(var(--contrast) / 0.04)" }}
          contentStyle={{
            background: "hsl(var(--popover) / 0.97)",
            border: "1px solid hsl(var(--contrast) / 0.12)",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          formatter={(v) => [fmtUsd(Number(v)), "Invoiced"]}
        />
        <Bar dataKey="revenue" name="Invoiced" fill="#c69437" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
