"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Liquid Backdrop with soft blur */}
      <div
        className="fixed inset-0 bg-surface-900/40 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Elevated Glass Modal Surface */}
      <div
        ref={modalRef}
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl glass-surface-elevated p-6 shadow-glass-elevated transition-all duration-200 animate-page-enter border border-white/80",
          maxWidthStyles[maxWidth]
        )}
      >
        {/* Top specular highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent pointer-events-none" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-bold tracking-tight text-surface-900">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs sm:text-sm text-surface-500 leading-normal">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-surface-400 hover:bg-white/80 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors border border-transparent hover:border-surface-200/60"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 text-sm text-surface-700">{children}</div>

        {footer && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-surface-200/60 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
