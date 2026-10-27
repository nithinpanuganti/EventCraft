import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  change?: string;
  isPositive?: boolean;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  change,
  isPositive,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "glass-card-interactive p-5",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          {title}
        </span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50/80 text-primary-600 border border-primary-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">{value}</div>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded-md",
              isPositive
                ? "bg-success-50 text-success-700 border border-success-200/60"
                : "bg-surface-100 text-surface-600 border border-surface-200"
            )}
          >
            {change}
          </span>
        )}
      </div>

      {description && <p className="mt-1 text-xs text-surface-500 leading-normal">{description}</p>}
    </div>
  );
}
