"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = "bg-accent",
  className,
  showLabel = true,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted mt-1 text-right">{pct.toFixed(1)}%</p>
      )}
    </div>
  );
}
