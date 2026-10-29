import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card border-2 border-dashed border-surface-300/70 p-8 text-center sm:p-12 flex flex-col items-center justify-center rounded-2xl shadow-glass relative overflow-hidden",
        className
      )}
    >
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/80 text-primary-600 border border-primary-200/70 shadow-[inset_0_1px_1.5px_rgba(255,255,255,1),0_4px_12px_rgba(124,58,237,0.1)] backdrop-blur-md">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="mt-4 text-base sm:text-lg font-bold tracking-tight text-surface-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-surface-500 leading-relaxed">{description}</p>
      {actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <Link href={actionHref}>
              <Button variant="primary" className="shadow-glass font-medium">{actionLabel}</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={onAction} className="shadow-glass font-medium">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
