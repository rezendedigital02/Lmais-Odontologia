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
  height = 300,
}: PieChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
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
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
