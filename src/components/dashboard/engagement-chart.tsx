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
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.3)"
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
        <Tooltip
          contentStyle={{
            background: "rgba(15,14,20,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontSize: 12,
            color: "#f4ecd8",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
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
