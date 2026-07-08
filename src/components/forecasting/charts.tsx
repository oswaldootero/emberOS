"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOOLTIP = {
  background: "hsl(var(--popover) / 0.97)",
  border: "1px solid hsl(var(--contrast) / 0.12)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

const fmt = (v: number) =>
  Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const usd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export function MonthlyRevenueChart({
  data,
}: {
  data: {
    label: string;
    wholesale: number;
    events: number;
    website: number;
    subscriptions: number;
    total: number;
  }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3b04f" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#e3b04f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--contrast) / 0.45)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--contrast) / 0.35)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => fmt(v)}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(value: number) => usd(value)}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#e3b04f"
          strokeWidth={2}
          fill="url(#gradTotal)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ChannelBreakdownPie({
  wholesale,
  events,
  website,
  subscriptions,
}: {
  wholesale: number;
  events: number;
  website: number;
  subscriptions: number;
}) {
  const data = [
    { name: "Wholesale", value: wholesale, fill: "#e3b04f" },
    { name: "Events", value: events, fill: "#a8845a" },
    { name: "Website", value: website, fill: "#7f5f3b" },
    { name: "Subscriptions", value: subscriptions, fill: "#c69437" },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground italic">
        No revenue yet — adjust inputs.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={88}
          paddingAngle={2}
          stroke="hsl(var(--ink-900))"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(value: number) => usd(value)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScenarioComparisonBars({
  data,
}: {
  data: { name: string; annualRevenue: number; annualProfit: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--contrast) / 0.45)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--contrast) / 0.35)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => fmt(v)}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(value: number) => usd(value)}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
        />
        <Bar dataKey="annualRevenue" name="Revenue" fill="#7f5f3b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="annualProfit" name="Profit" fill="#e3b04f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MarginLine({
  data,
}: {
  data: { label: string; grossMargin: number; netMargin: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
        <XAxis dataKey="label" stroke="hsl(var(--contrast) / 0.45)" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis
          stroke="hsl(var(--contrast) / 0.35)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
        />
        <Line type="monotone" dataKey="grossMargin" name="Gross" stroke="#7f5f3b" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="netMargin" name="Net" stroke="#e3b04f" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
