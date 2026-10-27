import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export interface ToastNotificationProps {
  type?: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
  onDismiss?: () => void;
  className?: string;
}

export function ToastNotification({
  type = "info",
  title,
  message,
  onDismiss,
  className,
}: ToastNotificationProps) {
  const icons = {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
  };

  const Icon = icons[type];

  const typeStyles = {
    success: "bg-success-50/90 border-success-500/30 text-success-900 shadow-glass backdrop-blur-md",
    warning: "bg-warning-50/90 border-warning-500/30 text-warning-900 shadow-glass backdrop-blur-md",
    error: "bg-danger-50/90 border-danger-500/30 text-danger-900 shadow-glass backdrop-blur-md",
    info: "bg-white/90 border-primary-500/30 text-surface-900 shadow-glass backdrop-blur-md",
  };

  const iconColors = {
    success: "text-success-600",
    warning: "text-warning-600",
    error: "text-danger-600",
    info: "text-primary-600",
  };

  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-4 transition-all duration-150 specular-top",
        typeStyles[type],
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColors[type])} />
      <div className="flex-1">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        {message && <p className="mt-0.5 text-xs opacity-90 leading-normal">{message}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-surface-400 hover:bg-black/5 hover:text-surface-700 focus:outline-none transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
