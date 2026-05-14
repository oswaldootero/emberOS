"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#e3b04f", "#a8845a", "#7f5f3b", "#5c4527", "#c69437", "#f4ecd8"];
const TOOLTIP = {
  background: "rgba(15,14,20,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
  color: "#f4ecd8",
};

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AIUsageTimeseries({
  data,
}: {
  data: { date: string; jobs: number; tokens: number; costUsd: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradJobs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3b04f" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#e3b04f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.3)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDay}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          labelFormatter={formatDay}
        />
        <Area
          type="monotone"
          dataKey="jobs"
          name="AI jobs"
          stroke="#e3b04f"
          strokeWidth={2}
          fill="url(#gradJobs)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AICostLine({
  data,
}: {
  data: { date: string; costUsd: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.3)"
          fontSize={9}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDay}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={9}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          formatter={(v: number) => [`$${v.toFixed(4)}`, "Spend"]}
          labelFormatter={formatDay}
        />
        <Line
          type="monotone"
          dataKey="costUsd"
          stroke="#c69437"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlatformStackedBars({
  data,
}: {
  data: {
    platform: string;
    queued: number;
    published: number;
    failed: number;
  }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="platform"
          stroke="rgba(255,255,255,0.4)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={TOOLTIP} />
        <Bar dataKey="published" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
        <Bar dataKey="queued" stackId="a" fill="#a8845a" radius={[0, 0, 0, 0]} />
        <Bar dataKey="failed" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ContentTypePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) return <EmptyChart label="No content yet" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={84}
          paddingAngle={2}
          stroke="rgba(11,10,15,1)"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TelegramTimeseries({
  data,
}: {
  data: { date: string; messages: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8845a" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#a8845a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.3)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDay}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          labelFormatter={formatDay}
        />
        <Area
          type="monotone"
          dataKey="messages"
          stroke="#a8845a"
          strokeWidth={2}
          fill="url(#gradTg)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground italic">
      {label}
    </div>
  );
}

// Backwards-compat exports — legacy demo charts still referenced elsewhere
export function PlatformBars({
  data,
}: {
  data: { platform: string; impressions: number; engagement: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="platform"
          stroke="rgba(255,255,255,0.4)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={TOOLTIP} />
        <Bar dataKey="impressions" fill="#7f5f3b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="engagement" fill="#e3b04f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ThemePie({ data }: { data: { name: string; value: number }[] }) {
  return <ContentTypePie data={data} />;
}
