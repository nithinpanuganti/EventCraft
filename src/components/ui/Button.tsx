import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-semibold transition-all duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const variantStyles = {
      primary: "glass-button-primary text-white focus-visible:ring-primary-500",
      secondary: "glass-button-secondary text-surface-800 focus-visible:ring-surface-400",
      outline: "glass-button-outline text-surface-800 focus-visible:ring-primary-500",
      ghost:
        "text-surface-700 hover:bg-white/80 hover:text-surface-900 active:bg-surface-200/60 focus-visible:ring-primary-400 rounded-xl",
      destructive:
        "bg-gradient-to-b from-danger-500 to-danger-600 text-white shadow-[0_3px_8px_rgba(220,38,38,0.28),inset_0_1px_1.5px_rgba(255,255,255,0.4)] hover:from-danger-600 hover:to-danger-700 active:from-danger-700 active:to-danger-800 focus-visible:ring-danger-500",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
      md: "h-9 px-4 text-sm gap-2 rounded-xl",
      lg: "h-11 px-6 text-base gap-2.5 rounded-2xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
