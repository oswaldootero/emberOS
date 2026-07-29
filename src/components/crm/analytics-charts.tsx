"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GOLD = "#e3b04f";
const COLORS = ["#e3b04f", "#a8845a", "#7f5f3b", "#5c4527", "#c69437", "#9c8b6a"];

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

const axis = {
  stroke: "hsl(var(--contrast) / 0.4)",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

const shortMonth = (m: string) => {
  const [y, mo] = m.split("-");
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(mo) - 1]} ${y!.slice(2)}`;
};

export function RevenueByMonthChart({
  data,
}: {
  data: { month: string; revenue: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="crmRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
          <XAxis dataKey="month" {...axis} tickFormatter={shortMonth} />
          <YAxis {...axis} tickFormatter={(v: number) => `$${fmt(v)}`} width={52} />
          <Tooltip
            contentStyle={TOOLTIP}
            labelFormatter={shortMonth}
            formatter={(v: number | string) => [`$${fmt(Number(v))}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#crmRev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopCustomersChart({
  data,
}: {
  data: { name: string; revenue: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
        >
          <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" horizontal={false} />
          <XAxis type="number" {...axis} tickFormatter={(v: number) => `$${fmt(v)}`} />
          <YAxis
            type="category"
            dataKey="name"
            {...axis}
            width={130}
            tickFormatter={(s: string) => (s.length > 18 ? `${s.slice(0, 17)}…` : s)}
          />
          <Tooltip
            contentStyle={TOOLTIP}
            formatter={(v: number | string) => [`$${fmt(Number(v))}`, "Revenue"]}
          />
          <Bar dataKey="revenue" fill={GOLD} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomerGrowthChart({
  data,
}: {
  data: { month: string; newCustomers: number }[];
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
          <XAxis dataKey="month" {...axis} tickFormatter={shortMonth} />
          <YAxis {...axis} allowDecimals={false} width={30} />
          <Tooltip
            contentStyle={TOOLTIP}
            labelFormatter={shortMonth}
            formatter={(v: number | string) => [v, "New customers"]}
          />
          <Bar dataKey="newCustomers" fill="#a8845a" radius={[4, 4, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export function BreakdownPie({
  data,
  nameKey,
  valueKey,
  format,
}: {
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  /** Serializable format flag — functions can't cross the RSC boundary */
  format?: "usd";
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            stroke="hsl(var(--ink-900))"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP}
            formatter={(v: number | string, name: string) => [
              format === "usd" ? fmtUsd(Number(v)) : v,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
