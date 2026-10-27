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
  const baseStyles = "inline-flex items-center font-medium rounded-full select-none transition-colors";

  const variantStyles = {
    primary: "bg-primary-50/90 text-primary-700 border border-primary-200/70 glass-pill",
    secondary: "bg-white/80 text-surface-700 border border-surface-200/70 glass-pill",
    success: "bg-success-50/90 text-success-800 border border-success-500/30 glass-pill",
    warning: "bg-warning-50/90 text-warning-800 border border-warning-500/30 glass-pill",
    danger: "bg-danger-50/90 text-danger-800 border border-danger-500/30 glass-pill",
    info: "bg-info-50/90 text-info-800 border border-info-500/30 glass-pill",
    outline: "border border-surface-300/80 text-surface-700 bg-white/60 backdrop-blur-sm",
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
