import React from "react";
import { cn } from "@/lib/utils";

export interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex p-1.5 gap-1.5 rounded-2xl glass-surface-subtle border border-surface-200/80 overflow-x-auto select-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              isActive
                ? "bg-white text-surface-900 shadow-[0_4px_12px_-1px_rgba(23,22,19,0.08),inset_0_1px_1px_rgba(255,255,255,1)] border border-surface-200/70"
                : "text-surface-600 hover:text-surface-900 hover:bg-white/60 border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count !== "undefined" && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700 border border-primary-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                    : "bg-surface-200/70 text-surface-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
