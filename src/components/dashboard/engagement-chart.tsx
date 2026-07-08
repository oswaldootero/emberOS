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

type Point = { date: string; engagement: number; reach: number };

export function EngagementChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradEngage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3b04f" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#e3b04f" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7f5f3b" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#7f5f3b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--contrast) / 0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--contrast) / 0.35)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--contrast) / 0.35)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover) / 0.97)",
            border: "1px solid hsl(var(--contrast) / 0.12)",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
        />
        <Area
          type="monotone"
          dataKey="reach"
          stroke="#7f5f3b"
          strokeWidth={1.5}
          fill="url(#gradReach)"
        />
        <Area
          type="monotone"
          dataKey="engagement"
          stroke="#e3b04f"
          strokeWidth={2}
          fill="url(#gradEngage)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
