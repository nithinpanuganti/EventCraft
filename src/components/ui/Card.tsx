import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: "default" | "elevated" | "subtle" | "accent";
}

export function Card({ className, hoverable = false, variant = "default", ...props }: CardProps) {
  const variantClasses = {
    default: hoverable ? "glass-card-interactive" : "glass-card",
    elevated: "glass-surface-elevated",
    subtle: "glass-surface-subtle rounded-2xl",
    accent: "glass-card-accent",
  };

  return (
    <div
      className={cn(
        variantClasses[variant],
        "p-5 sm:p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col space-y-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-bold leading-tight tracking-tight text-surface-900 sm:text-lg", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs sm:text-sm text-surface-500 leading-relaxed", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex items-center border-t border-surface-200/60 pt-4", className)}
      {...props}
    />
  );
}
