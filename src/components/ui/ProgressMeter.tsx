import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValueText?: boolean;
  variant?: "primary" | "success" | "warning" | "danger";
}

export function ProgressMeter({
  value,
  max = 100,
  label,
  showValueText = true,
  variant = "primary",
  className,
  ...props
}: ProgressMeterProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const fillColors = {
    primary: "bg-gradient-to-r from-primary-500 to-primary-600 shadow-[0_0_8px_rgba(124,58,237,0.35)]",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.35)]",
    warning: "bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.35)]",
    danger: "bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.35)]",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)} {...props}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-surface-700">{label}</span>}
          {showValueText && <span className="text-surface-500 font-mono font-medium">{percentage}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-200/60 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-surface-200/50 backdrop-blur-sm"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300 ease-out", fillColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
