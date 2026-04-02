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
    <div className="bg-card rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tick={{ fontSize: 10 }}
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
  );
}
