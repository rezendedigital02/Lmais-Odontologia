"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "default" | "green" | "red" | "yellow";
  children?: React.ReactNode;
}

const colorMap = {
  default: "border-l-primary",
  green: "border-l-accent",
  red: "border-l-danger",
  yellow: "border-l-warning",
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "default",
  children,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-5 border-l-4 shadow-sm",
        colorMap[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                trend === "up" && "text-accent",
                trend === "down" && "text-danger",
                trend === "neutral" && "text-muted"
              )}
            >
              {trend === "up" ? "+" : trend === "down" ? "-" : ""}
              {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon size={20} className="text-primary" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
