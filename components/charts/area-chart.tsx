"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatBRL } from "@/lib/utils";

interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  areas: { key: string; color: string; name: string }[];
  title: string;
  formatAsCurrency?: boolean;
  height?: number;
}

export function AreaChartComponent({
  data,
  xKey,
  areas,
  title,
  formatAsCurrency = false,
}: AreaChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0">
      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">{title}</h3>
      <div className="h-[240px] sm:h-[300px] md:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="#94a3b8"
              width={60}
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
                fontSize: "11px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {areas.map((area) => (
              <Area
                key={area.key}
                type="monotone"
                dataKey={area.key}
                stroke={area.color}
                fill={area.color}
                fillOpacity={0.15}
                name={area.name}
                strokeWidth={2}
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
