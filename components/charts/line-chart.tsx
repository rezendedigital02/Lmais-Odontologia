"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatBRL } from "@/lib/utils";

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; color: string; name: string }[];
  title: string;
  formatAsCurrency?: boolean;
  height?: number;
}

export function LineChartComponent({
  data,
  xKey,
  lines,
  title,
  formatAsCurrency = false,
  height = 300,
}: LineChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#94a3b8"
            tickFormatter={formatAsCurrency ? (v) => formatBRL(v) : undefined}
          />
          <Tooltip
            formatter={(value) =>
              formatAsCurrency ? formatBRL(Number(value)) : value
            }
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              name={line.name}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
