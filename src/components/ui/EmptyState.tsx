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
        "glass-card border-2 border-dashed border-surface-300/70 p-8 text-center sm:p-12 flex flex-col items-center justify-center rounded-2xl shadow-glass",
        className
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50/90 text-primary-600 border border-primary-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="mt-4 text-base font-semibold tracking-tight text-surface-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-surface-500 leading-relaxed">{description}</p>
      {actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <Link href={actionHref}>
              <Button variant="primary" className="shadow-glass">{actionLabel}</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={onAction} className="shadow-glass">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
