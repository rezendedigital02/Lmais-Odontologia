"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatBRL } from "@/lib/utils";

interface PieChartProps {
  data: { name: string; value: number }[];
  title: string;
  formatAsCurrency?: boolean;
  height?: number;
}

const COLORS = [
  "#1e3a5f",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
];

export function PieChartComponent({
  data,
  title,
  formatAsCurrency = false,
}: PieChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0">
      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">{title}</h3>
      <div className="h-[260px] sm:h-[300px] md:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius="35%"
              outerRadius="60%"
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
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
            <Legend wrapperStyle={{ fontSize: "10px" }} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
