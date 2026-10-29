import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "secondary",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center font-semibold rounded-full select-none transition-colors glass-pill";

  const variantStyles = {
    primary:
      "bg-primary-50/90 text-primary-700 border border-primary-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(124,58,237,0.06)]",
    secondary:
      "bg-white/80 text-surface-700 border border-surface-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.02)]",
    success:
      "bg-success-50/90 text-success-800 border border-success-500/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(34,197,94,0.06)]",
    warning:
      "bg-warning-50/90 text-warning-800 border border-warning-500/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(245,158,11,0.06)]",
    danger:
      "bg-danger-50/90 text-danger-800 border border-danger-500/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(239,68,68,0.06)]",
    info:
      "bg-info-50/90 text-info-800 border border-info-500/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(14,165,233,0.06)]",
    outline:
      "border border-surface-300/80 text-surface-700 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}>
      {children}
    </span>
  );
}
