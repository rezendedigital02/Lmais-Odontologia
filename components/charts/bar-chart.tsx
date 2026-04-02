"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatBRL } from "@/lib/utils";

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; color: string; name: string; stackId?: string }[];
  title: string;
  formatAsCurrency?: boolean;
  height?: number;
  layout?: "horizontal" | "vertical";
}

export function BarChartComponent({
  data,
  xKey,
  bars,
  title,
  formatAsCurrency = false,
  height = 300,
  layout = "horizontal",
}: BarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0">
      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">{title}</h3>
      <div className={isVertical ? "h-[300px] sm:h-[350px]" : "h-[240px] sm:h-[280px] md:h-[300px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            layout={isVertical ? "vertical" : "horizontal"}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {isVertical ? (
              <>
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                  tickFormatter={formatAsCurrency ? (v) => formatBRL(v) : undefined}
                />
                <YAxis
                  type="category"
                  dataKey={xKey}
                  tick={{ fontSize: 9 }}
                  stroke="#94a3b8"
                  width={90}
                />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                  width={60}
                  tickFormatter={formatAsCurrency ? (v) => formatBRL(v) : undefined}
                />
              </>
            )}
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
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                fill={bar.color}
                name={bar.name}
                stackId={bar.stackId}
                radius={bar.stackId ? undefined : [4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
