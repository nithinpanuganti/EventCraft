import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
}

export function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-surface-200/70 border border-surface-200/40 backdrop-blur-sm",
        variant === "circular" && "rounded-full",
        variant === "text" && "h-4 rounded-lg",
        variant === "rectangular" && "rounded-xl",
        className
      )}
      {...props}
    />
  );
}
