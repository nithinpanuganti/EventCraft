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
        "glass-card-interactive p-5 relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-surface-500">
          {title}
        </span>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/90 text-primary-600 border border-primary-200/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_6px_rgba(124,58,237,0.08)] backdrop-blur-md">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-baseline gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">{value}</div>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full border",
              isPositive
                ? "bg-success-50 text-success-700 border-success-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                : "bg-surface-100 text-surface-600 border-surface-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            )}
          >
            {change}
          </span>
        )}
      </div>

      {description && <p className="mt-1.5 text-xs text-surface-500 leading-normal">{description}</p>}
    </div>
  );
}
