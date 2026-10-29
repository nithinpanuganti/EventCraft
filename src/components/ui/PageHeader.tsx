import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, badge, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-surface-200/70 pb-6 sm:flex-row sm:items-center sm:justify-between relative",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && <p className="text-xs sm:text-sm text-surface-500 max-w-2xl leading-relaxed">{description}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
