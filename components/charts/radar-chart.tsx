"use client";

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarChartProps {
  data: { subject: string; value: number; fullMark: number }[];
  title: string;
  height?: number;
}

export function RadarChartComponent({
  data,
  title,
  height = 300,
}: RadarChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0">
      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">{title}</h3>
      <div className="h-[220px] sm:h-[280px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="65%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 10]}
              tick={{ fontSize: 9 }}
            />
            <Radar
              name="Média"
              dataKey="value"
              stroke="#1e3a5f"
              fill="#1e3a5f"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
